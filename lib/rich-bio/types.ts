export type Mark = "b" | "i" | "u" | "s";

export type Run = {
	text: string;
	marks?: Mark[];
	href?: string;
	cta?: boolean;
};

export type TextBlockType = "p" | "h2" | "h3" | "quote";

export type ListBlockType = "ul" | "ol";

export type TableCell = {
	runs: Run[];
	header?: boolean;
	colspan?: number;
	rowspan?: number;
};

export type TableRow = { cells: TableCell[] };

export type Block =
	| { type: TextBlockType; runs: Run[] }
	| { type: ListBlockType; items: Run[][] }
	| { type: "hr" }
	| { type: "img"; src: string; alt?: string }
	| { type: "table"; rows: TableRow[] }
	// Anything the block model doesn't cover, kept verbatim so editing on mobile
	// never drops what was written on web.
	| { type: "raw"; html: string };

export const MARK_TAGS: Record<Mark, string> = {
	b: "strong",
	i: "em",
	u: "u",
	s: "s",
};
