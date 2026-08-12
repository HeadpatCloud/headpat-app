import type { Mark, Run } from "@/lib/rich-bio/types";

const MARK_ORDER: Mark[] = ["b", "i", "u", "s"];

function sortMarks(marks: Mark[]): Mark[] {
	return MARK_ORDER.filter((m) => marks.includes(m));
}

function sameFormat(a: Run, b: Run): boolean {
	return (
		(a.href ?? "") === (b.href ?? "") &&
		!!a.cta === !!b.cta &&
		(a.marks ?? []).join() === (b.marks ?? []).join()
	);
}

export function normalizeRuns(runs: Run[]): Run[] {
	const out: Run[] = [];
	for (const run of runs) {
		if (!run.text) continue;
		const marks = run.marks?.length ? sortMarks(run.marks) : undefined;
		const next: Run = { text: run.text };
		if (marks) next.marks = marks;
		if (run.href) {
			next.href = run.href;
			if (run.cta) next.cta = true;
		}
		const last = out[out.length - 1];
		if (last && sameFormat(last, next)) last.text += next.text;
		else out.push(next);
	}
	return out;
}

export function runsToText(runs: Run[]): string {
	return runs.map((r) => r.text).join("");
}

export function sliceRuns(runs: Run[], start: number, end: number): Run[] {
	const out: Run[] = [];
	let pos = 0;
	for (const run of runs) {
		const from = Math.max(start - pos, 0);
		const to = Math.min(end - pos, run.text.length);
		if (to > from) out.push({ ...run, text: run.text.slice(from, to) });
		pos += run.text.length;
	}
	return normalizeRuns(out);
}

function mapRange(
	runs: Run[],
	start: number,
	end: number,
	fn: (run: Run) => Run,
): Run[] {
	if (end <= start) return runs;
	const out: Run[] = [];
	let pos = 0;
	for (const run of runs) {
		const from = Math.max(start - pos, 0);
		const to = Math.min(end - pos, run.text.length);
		pos += run.text.length;
		if (to <= from) {
			out.push(run);
			continue;
		}
		if (from > 0) out.push({ ...run, text: run.text.slice(0, from) });
		out.push(fn({ ...run, text: run.text.slice(from, to) }));
		if (to < run.text.length) out.push({ ...run, text: run.text.slice(to) });
	}
	return normalizeRuns(out);
}

export function applyMark(
	runs: Run[],
	start: number,
	end: number,
	mark: Mark,
	on: boolean,
): Run[] {
	return mapRange(runs, start, end, (run) => {
		const marks = new Set(run.marks ?? []);
		if (on) marks.add(mark);
		else marks.delete(mark);
		const next: Run = { ...run };
		if (marks.size) next.marks = sortMarks([...marks]);
		else delete next.marks;
		return next;
	});
}

export function applyLink(
	runs: Run[],
	start: number,
	end: number,
	href: string | null,
	cta: boolean,
): Run[] {
	return mapRange(runs, start, end, (run) => {
		const next: Run = { ...run };
		if (href) {
			next.href = href;
			if (cta) next.cta = true;
			else delete next.cta;
		} else {
			delete next.href;
			delete next.cta;
		}
		return next;
	});
}

function runAt(runs: Run[], offset: number): Run | undefined {
	let pos = 0;
	for (const run of runs) {
		pos += run.text.length;
		if (offset < pos) return run;
	}
	return runs[runs.length - 1];
}

/**
 * Rewrites runs for an edited plain-text value. The changed span inherits the
 * marks next to it but never a link — typing at the end of a link shouldn't
 * silently extend the link's text.
 */
export function replaceText(runs: Run[], next: string): Run[] {
	const prev = runsToText(runs);
	if (prev === next) return runs;
	if (!runs.length) return next ? [{ text: next }] : [];

	const max = Math.min(prev.length, next.length);
	let head = 0;
	while (head < max && prev[head] === next[head]) head++;
	let tail = 0;
	while (
		tail < max - head &&
		prev[prev.length - 1 - tail] === next[next.length - 1 - tail]
	) {
		tail++;
	}

	const inserted = next.slice(head, next.length - tail);
	const out = sliceRuns(runs, 0, head);
	if (inserted) {
		const anchor = runAt(runs, Math.max(head - 1, 0));
		const run: Run = { text: inserted };
		if (anchor?.marks?.length) run.marks = [...anchor.marks];
		out.push(run);
	}
	out.push(...sliceRuns(runs, prev.length - tail, prev.length));
	return normalizeRuns(out);
}

export function activeMarks(runs: Run[], start: number, end: number): Mark[] {
	const covered = end > start ? sliceRuns(runs, start, end) : runs;
	if (!covered.length) return [];
	return MARK_ORDER.filter((mark) =>
		covered.every((run) => run.marks?.includes(mark)),
	);
}

export function linkAt(
	runs: Run[],
	start: number,
	end: number,
): { href: string; cta: boolean } | null {
	const covered = end > start ? sliceRuns(runs, start, end) : runs;
	const linked = covered.find((run) => run.href);
	return linked ? { href: linked.href ?? "", cta: !!linked.cta } : null;
}
