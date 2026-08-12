import { normalizeRuns } from "@/lib/rich-bio/runs";
import type {
	Block,
	Mark,
	Run,
	TableCell,
	TableRow,
} from "@/lib/rich-bio/types";

const MARK_BY_TAG: Record<string, Mark> = {
	strong: "b",
	b: "b",
	em: "i",
	i: "i",
	u: "u",
	s: "s",
	strike: "s",
	del: "s",
};

const ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
};

const TAG_RE = /<(\/)?([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>])*)>/g;
const ATTR_RE =
	/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

type Tag = {
	kind: "open" | "close";
	name: string;
	attrs: Record<string, string>;
	start: number;
	end: number;
};

type Token = Tag | { kind: "text"; text: string; start: number; end: number };

type Cursor = { i: number };

function decode(text: string): string {
	return text.replace(/&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z]+);/g, (m, entity) => {
		if (entity[0] === "#") {
			const code =
				entity[1] === "x" || entity[1] === "X"
					? Number.parseInt(entity.slice(2), 16)
					: Number.parseInt(entity.slice(1), 10);
			return Number.isFinite(code) ? String.fromCodePoint(code) : m;
		}
		return ENTITIES[entity.toLowerCase()] ?? m;
	});
}

// Source newlines are markup whitespace, not line breaks — only <br> makes one.
function collapse(text: string): string {
	return text.replace(/[\t\r\n]+\s*/g, " ");
}

function parseAttrs(source: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	for (const m of source.matchAll(ATTR_RE)) {
		attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
	}
	return attrs;
}

function tokenize(html: string): Token[] {
	const tokens: Token[] = [];
	let last = 0;
	for (const m of html.matchAll(TAG_RE)) {
		const start = m.index;
		if (start > last) {
			tokens.push({
				kind: "text",
				text: html.slice(last, start),
				start: last,
				end: start,
			});
		}
		tokens.push({
			kind: m[1] ? "close" : "open",
			name: m[2].toLowerCase(),
			attrs: m[1] ? {} : parseAttrs(m[3] ?? ""),
			start,
			end: start + m[0].length,
		});
		last = start + m[0].length;
	}
	if (last < html.length) {
		tokens.push({
			kind: "text",
			text: html.slice(last),
			start: last,
			end: html.length,
		});
	}
	return tokens;
}

function imageBlock(attrs: Record<string, string>): Block | null {
	const src = attrs.src?.trim();
	if (!src) return null;
	return attrs.alt
		? { type: "img", src, alt: attrs.alt }
		: { type: "img", src };
}

function collectInline(
	tokens: Token[],
	cur: Cursor,
	stop: string,
	extras: Block[],
): Run[] {
	const runs: Run[] = [];
	const marks: Mark[] = [];
	const links: { href: string; cta: boolean }[] = [];

	const push = (text: string) => {
		if (!text) return;
		const link = links[links.length - 1];
		const run: Run = { text };
		if (marks.length) run.marks = [...marks];
		if (link) {
			run.href = link.href;
			if (link.cta) run.cta = true;
		}
		runs.push(run);
	};

	while (cur.i < tokens.length) {
		const token = tokens[cur.i];
		if (token.kind === "text") {
			cur.i++;
			push(collapse(decode(token.text)));
			continue;
		}
		if (token.kind === "close") {
			cur.i++;
			if (token.name === stop) break;
			const mark = MARK_BY_TAG[token.name];
			if (mark) {
				const idx = marks.lastIndexOf(mark);
				if (idx >= 0) marks.splice(idx, 1);
			} else if (token.name === "a") {
				links.pop();
			}
			continue;
		}
		cur.i++;
		if (token.name === "br") {
			push("\n");
			continue;
		}
		const mark = MARK_BY_TAG[token.name];
		if (mark) {
			marks.push(mark);
			continue;
		}
		if (token.name === "a") {
			links.push({
				href: token.attrs.href ?? "",
				cta: /\bbio-cta\b/.test(token.attrs.class ?? ""),
			});
			continue;
		}
		if (token.name === "img") {
			const block = imageBlock(token.attrs);
			if (block) extras.push(block);
			continue;
		}
		// A nested <p> (blockquotes hold paragraphs) reads as a line break.
		if (token.name === "p" && runs.length) push("\n");
	}
	return normalizeRuns(runs);
}

function parseList(
	tokens: Token[],
	cur: Cursor,
	name: "ul" | "ol",
	out: Block[],
): void {
	const items: Run[][] = [];
	const extras: Block[] = [];
	while (cur.i < tokens.length) {
		const token = tokens[cur.i];
		if (token.kind === "close") {
			cur.i++;
			if (token.name === name) break;
			continue;
		}
		if (token.kind === "text") {
			cur.i++;
			continue;
		}
		cur.i++;
		if (token.name === "li")
			items.push(collectInline(tokens, cur, "li", extras));
	}
	out.push({ type: name, items });
	out.push(...extras);
}

function parseTable(tokens: Token[], cur: Cursor, out: Block[]): void {
	const rows: TableRow[] = [];
	const extras: Block[] = [];
	let cells: TableCell[] | null = null;
	while (cur.i < tokens.length) {
		const token = tokens[cur.i];
		if (token.kind === "close") {
			cur.i++;
			if (token.name === "table") break;
			if (token.name === "tr" && cells) {
				rows.push({ cells });
				cells = null;
			}
			continue;
		}
		if (token.kind === "text") {
			cur.i++;
			continue;
		}
		cur.i++;
		if (token.name === "tr") {
			cells = [];
			continue;
		}
		if (token.name === "th" || token.name === "td") {
			if (!cells) cells = [];
			const cell: TableCell = {
				runs: collectInline(tokens, cur, token.name, extras),
			};
			if (token.name === "th") cell.header = true;
			const colspan = Number(token.attrs.colspan);
			const rowspan = Number(token.attrs.rowspan);
			if (colspan > 1) cell.colspan = colspan;
			if (rowspan > 1) cell.rowspan = rowspan;
			cells.push(cell);
		}
	}
	if (cells) rows.push({ cells });
	out.push({ type: "table", rows });
	out.push(...extras);
}

// Everything the model doesn't know is kept as its original markup so a mobile
// edit can hand it back to the server untouched.
function rawSlice(html: string, tokens: Token[], cur: Cursor): string {
	const open = tokens[cur.i] as Tag;
	let depth = 0;
	cur.i++;
	while (cur.i < tokens.length) {
		const token = tokens[cur.i];
		if (token.kind === "open" && token.name === open.name) depth++;
		if (token.kind === "close" && token.name === open.name) {
			cur.i++;
			if (depth === 0) return html.slice(open.start, token.end);
			depth--;
			continue;
		}
		cur.i++;
	}
	return html.slice(open.start);
}

export function parseBioHtml(html: string): Block[] {
	if (!html) return [];
	const tokens = tokenize(html);
	const cur: Cursor = { i: 0 };
	const blocks: Block[] = [];

	while (cur.i < tokens.length) {
		const token = tokens[cur.i];
		if (token.kind === "text") {
			cur.i++;
			const text = collapse(decode(token.text)).trim();
			if (text) blocks.push({ type: "p", runs: [{ text }] });
			continue;
		}
		if (token.kind === "close") {
			cur.i++;
			continue;
		}
		const { name } = token;
		if (name === "p" || name === "h2" || name === "h3") {
			cur.i++;
			const extras: Block[] = [];
			blocks.push({
				type: name,
				runs: collectInline(tokens, cur, name, extras),
			});
			blocks.push(...extras);
			continue;
		}
		if (name === "blockquote") {
			cur.i++;
			const extras: Block[] = [];
			blocks.push({
				type: "quote",
				runs: collectInline(tokens, cur, name, extras),
			});
			blocks.push(...extras);
			continue;
		}
		if (name === "ul" || name === "ol") {
			cur.i++;
			parseList(tokens, cur, name, blocks);
			continue;
		}
		if (name === "table") {
			cur.i++;
			parseTable(tokens, cur, blocks);
			continue;
		}
		if (name === "hr") {
			cur.i++;
			blocks.push({ type: "hr" });
			continue;
		}
		if (name === "img") {
			cur.i++;
			const block = imageBlock(token.attrs);
			if (block) blocks.push(block);
			continue;
		}
		if (name === "br" || name === "thead" || name === "tbody") {
			cur.i++;
			continue;
		}
		blocks.push({ type: "raw", html: rawSlice(html, tokens, cur) });
	}
	return blocks;
}
