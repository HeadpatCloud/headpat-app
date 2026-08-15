import { runsToText } from "@/lib/rich-bio/runs";
import {
	type Block,
	MARK_TAGS,
	type Mark,
	type Run,
} from "@/lib/rich-bio/types";

// Innermost first, so the emitted nesting is <strong><em><u><s>.
const NESTING: Mark[] = ["s", "u", "i", "b"];

function escapeText(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\n/g, "<br />");
}

function escapeAttr(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function runHtml(run: Run): string {
	let html = escapeText(run.text);
	for (const mark of NESTING) {
		if (run.marks?.includes(mark)) {
			html = `<${MARK_TAGS[mark]}>${html}</${MARK_TAGS[mark]}>`;
		}
	}
	if (run.href) {
		const cls = run.cta ? ' class="bio-cta"' : "";
		html = `<a href="${escapeAttr(run.href)}"${cls}>${html}</a>`;
	}
	return html;
}

function runsHtml(runs: Run[]): string {
	return runs.map(runHtml).join("");
}

function blockHtml(block: Block): string {
	switch (block.type) {
		case "p":
			return `<p>${runsHtml(block.runs)}</p>`;
		case "h2":
		case "h3":
			return `<${block.type}>${runsHtml(block.runs)}</${block.type}>`;
		case "quote":
			return `<blockquote><p>${runsHtml(block.runs)}</p></blockquote>`;
		case "ul":
		case "ol": {
			const items = block.items
				.map((runs) => `<li>${runsHtml(runs)}</li>`)
				.join("");
			return `<${block.type}>${items}</${block.type}>`;
		}
		case "hr":
			return "<hr />";
		case "img": {
			const alt = block.alt ? ` alt="${escapeAttr(block.alt)}"` : "";
			return `<img src="${escapeAttr(block.src)}"${alt} />`;
		}
		case "table": {
			const rows = block.rows
				.map((row) => {
					const cells = row.cells
						.map((cell) => {
							const tag = cell.header ? "th" : "td";
							const colspan = cell.colspan ? ` colspan="${cell.colspan}"` : "";
							const rowspan = cell.rowspan ? ` rowspan="${cell.rowspan}"` : "";
							return `<${tag}${colspan}${rowspan}>${runsHtml(cell.runs)}</${tag}>`;
						})
						.join("");
					return `<tr>${cells}</tr>`;
				})
				.join("");
			return `<table><tbody>${rows}</tbody></table>`;
		}
		case "raw":
			return block.html;
	}
}

function isEmptyText(block: Block): boolean {
	if (block.type === "ul" || block.type === "ol") {
		return block.items.every((runs) => !runsToText(runs).trim());
	}
	if (block.type === "p" || block.type === "h2" || block.type === "h3") {
		return !runsToText(block.runs).trim();
	}
	if (block.type === "quote") return !runsToText(block.runs).trim();
	return false;
}

export function serializeBio(blocks: Block[]): string {
	let start = 0;
	let end = blocks.length;
	while (start < end && isEmptyText(blocks[start])) start++;
	while (end > start && isEmptyText(blocks[end - 1])) end--;
	const kept = blocks.slice(start, end);
	if (!kept.length) return "";
	return kept.map(blockHtml).join("");
}
