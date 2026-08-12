import { parseBioHtml } from "@/lib/rich-bio/parse";
import {
	activeMarks,
	applyLink,
	applyMark,
	linkAt,
	replaceText,
	runsToText,
} from "@/lib/rich-bio/runs";
import { serializeBio } from "@/lib/rich-bio/serialize";
import type { Run } from "@/lib/rich-bio/types";

const roundTrip = (html: string) => serializeBio(parseBioHtml(html));

describe("parse/serialize", () => {
	it("round-trips the tags the API allows", () => {
		const cases = [
			"<p>hello</p>",
			"<h2>Title</h2><h3>Sub</h3>",
			"<p>a<br />b</p>",
			"<p><strong>bold</strong> and <em>italic</em></p>",
			"<p><u>under</u><s>struck</s></p>",
			"<ul><li>one</li><li>two</li></ul>",
			"<ol><li>one</li></ol>",
			"<blockquote><p>quoted</p></blockquote>",
			"<hr />",
			'<p><a href="https://example.com">link</a></p>',
			'<img src="/api/files/bio-image/u1/f1" />',
			'<img src="/api/files/bio-image/u1/f1" alt="me" />',
		];
		for (const html of cases) expect(roundTrip(html)).toBe(html);
	});

	it("keeps CTA buttons", () => {
		const html =
			'<p><a href="https://example.com" class="bio-cta">Commission me</a></p>';
		expect(roundTrip(html)).toBe(html);
		const [block] = parseBioHtml(html);
		expect(block).toEqual({
			type: "p",
			runs: [{ text: "Commission me", href: "https://example.com", cta: true }],
		});
	});

	it("keeps tables", () => {
		const html =
			"<table><tbody><tr><th>Type</th><td>Price</td></tr><tr><td>Sketch</td><td>20</td></tr></tbody></table>";
		expect(roundTrip(html)).toBe(html);
	});

	it("preserves markup it doesn't model", () => {
		const html = "<p>hi</p><figure><figcaption>x</figcaption></figure>";
		expect(parseBioHtml(html)[1]).toEqual({
			type: "raw",
			html: "<figure><figcaption>x</figcaption></figure>",
		});
		expect(roundTrip(html)).toBe(html);
	});

	it("decodes and re-escapes entities", () => {
		const [block] = parseBioHtml("<p>a &amp; b &lt;c&gt;</p>");
		expect(block).toEqual({ type: "p", runs: [{ text: "a & b <c>" }] });
		expect(roundTrip("<p>a &amp; b &lt;c&gt;</p>")).toBe(
			"<p>a &amp; b &lt;c&gt;</p>",
		);
	});

	it("treats source newlines as whitespace, not line breaks", () => {
		const [block] = parseBioHtml("<p>one\n\ttwo</p>");
		expect(block).toEqual({ type: "p", runs: [{ text: "one two" }] });
	});

	it("nests marks inside links", () => {
		const html =
			'<p><a href="https://x.dev"><strong>bold link</strong></a></p>';
		expect(roundTrip(html)).toBe(html);
	});

	it("serializes empty content as an empty string", () => {
		expect(serializeBio(parseBioHtml("<p></p><p>  </p>"))).toBe("");
		expect(serializeBio([])).toBe("");
	});

	it("drops empty paragraphs around the edges but keeps dividers", () => {
		expect(roundTrip("<p></p><hr /><p></p>")).toBe("<hr />");
	});
});

describe("inline run edits", () => {
	const runs: Run[] = [{ text: "hello world" }];

	it("marks a selection", () => {
		const next = applyMark(runs, 0, 5, "b", true);
		expect(next).toEqual([{ text: "hello", marks: ["b"] }, { text: " world" }]);
		expect(activeMarks(next, 0, 5)).toEqual(["b"]);
		expect(activeMarks(next, 0, 11)).toEqual([]);
	});

	it("unmarks a selection", () => {
		const bold = applyMark(runs, 0, 11, "b", true);
		expect(applyMark(bold, 0, 11, "b", false)).toEqual([
			{ text: "hello world" },
		]);
	});

	it("links and unlinks a selection", () => {
		const linked = applyLink(runs, 6, 11, "https://x.dev", true);
		expect(linked[1]).toEqual({
			text: "world",
			href: "https://x.dev",
			cta: true,
		});
		expect(linkAt(linked, 6, 11)).toEqual({ href: "https://x.dev", cta: true });
		expect(applyLink(linked, 0, 11, null, false)).toEqual([
			{ text: "hello world" },
		]);
	});

	it("keeps marks when text around them is edited", () => {
		const marked = applyMark(runs, 0, 5, "b", true);
		const edited = replaceText(marked, "hello there world");
		expect(runsToText(edited)).toBe("hello there world");
		expect(edited[0]).toEqual({ text: "hello", marks: ["b"] });
	});

	it("does not extend a link when typing after it", () => {
		const linked = applyLink(runs, 0, 5, "https://x.dev", false);
		const edited = replaceText(linked, "hello!! world");
		expect(edited.find((run) => run.text.includes("!!"))?.href).toBeUndefined();
	});

	it("handles deletions across runs", () => {
		const marked = applyMark(runs, 0, 5, "b", true);
		expect(replaceText(marked, "world")).toEqual([{ text: "world" }]);
	});

	it("starts from empty", () => {
		expect(replaceText([], "hi")).toEqual([{ text: "hi" }]);
	});
});
