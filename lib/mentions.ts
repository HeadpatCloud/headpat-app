// Finds user mentions in plain text: "@name" (a profile URL slug) and full
// profile links such as https://headpat.place/user/name. Only the shape is
// checked here; whether the user exists is resolved through the API, and
// anything that doesn't resolve stays plain text.

export type MentionPart =
	| { kind: "text"; text: string }
	| { kind: "mention"; text: string; handle: string };

const HOSTS = String.raw`(?:www\.)?(?:headpat\.place|headpat\.app)`;
const PROFILE_LINK = String.raw`https?://${HOSTS}(?:/(?:en|de|nl))?/user/([^\s/?#<>"'()[\]{}]+)/?`;
const AT_NAME = "@([A-Za-z0-9_][A-Za-z0-9_.-]{0,63})";
const MENTION_RE = new RegExp(`${PROFILE_LINK}|${AT_NAME}`, "gi");

// A link ends at whitespace, or at closing punctuation that is itself followed
// by whitespace or the end; "/user/x/followers" or "/user/x?tab=1" is another
// page and stays a plain link.
const LINK_END = /^(?:$|\s|[.,!?;:)\]}'"]+(?:$|\s))/;
// "@" glued to a word is an email address or something else, not a mention.
const AT_BLOCKED_BEFORE = /[A-Za-z0-9_.@/+-]/;
// Sentence punctuation right after a mention isn't part of the name.
const TRAILING_PUNCT = /[.,!?;:-]+$/;

const MAX_HANDLE = 64;

function decodeSegment(segment: string): string | null {
	try {
		return decodeURIComponent(segment);
	} catch {
		return null;
	}
}

export function parseMentions(text: string): MentionPart[] {
	if (!text || (!text.includes("@") && !text.includes("/user/"))) {
		return [{ kind: "text", text }];
	}
	const parts: MentionPart[] = [];
	let last = 0;
	MENTION_RE.lastIndex = 0;
	for (let m = MENTION_RE.exec(text); m; m = MENTION_RE.exec(text)) {
		const start = m.index;
		let raw = m[0];
		let handle: string | null = null;
		if (m[1] !== undefined) {
			const trimmed = m[1].replace(TRAILING_PUNCT, "");
			const cut = m[1].length - trimmed.length;
			if (cut > 0 && raw.endsWith("/")) raw = raw.slice(0, -1);
			raw = raw.slice(0, raw.length - cut);
			if (trimmed && LINK_END.test(text.slice(start + raw.length)))
				handle = decodeSegment(trimmed);
		} else if (m[2] !== undefined) {
			const before = start > 0 ? text[start - 1] : "";
			const trimmed = m[2].replace(TRAILING_PUNCT, "");
			if (trimmed && !AT_BLOCKED_BEFORE.test(before)) {
				handle = trimmed;
				raw = `@${trimmed}`;
			}
		}
		if (!handle || handle.length > MAX_HANDLE) {
			// Not a mention: skip past the "@" or link start only, so a real
			// mention later in the same run still gets a chance.
			MENTION_RE.lastIndex = start + 1;
			continue;
		}
		if (start > last)
			parts.push({ kind: "text", text: text.slice(last, start) });
		parts.push({ kind: "mention", text: raw, handle });
		last = start + raw.length;
		MENTION_RE.lastIndex = last;
	}
	if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
	return parts.length > 0 ? parts : [{ kind: "text", text }];
}

/** The distinct handles mentioned in `parts`, in order of appearance. */
export function mentionHandles(parts: MentionPart[]): string[] {
	const seen = new Set<string>();
	for (const p of parts) if (p.kind === "mention") seen.add(p.handle);
	return [...seen];
}

/** The handle a link points at, when it is a Headpat profile link. */
export function profileLinkHandle(href: string): string | null {
	const parts = parseMentions(href.trim());
	const only = parts.length === 1 ? parts[0] : null;
	return only?.kind === "mention" && !only.text.startsWith("@")
		? only.handle
		: null;
}
