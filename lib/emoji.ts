import { Platform } from "react-native";

// Built by scripts/build-emoji-data.ts from emojibase-data, the dataset the
// website's picker uses, so both offer the same emoji and search words.
type EmojiRow = [string, number, number] | [string, number, number, string[]];
type LocaleData = {
	groups: Record<string, string>;
	skinTones: string[];
	labels: string[];
	tags: string[];
};
type EmojiData = {
	groups: number[];
	emojis: EmojiRow[];
	locales: Record<string, LocaleData>;
};

export const SKIN_TONES = [
	"none",
	"light",
	"medium-light",
	"medium",
	"medium-dark",
	"dark",
] as const;
export type SkinTone = (typeof SKIN_TONES)[number];

export type Emoji = {
	emoji: string;
	label: string;
	/** Lowercased label and tags, for search. */
	search: string;
	/** Tone variants in SKIN_TONES order without "none", when it has them. */
	skins?: string[];
};
export type EmojiCategory = { group: number; label: string; emojis: Emoji[] };
export type EmojiSet = {
	categories: EmojiCategory[];
	/** Labels for SKIN_TONES, "none" first. */
	skinToneLabels: string[];
};

let raw: EmojiData | null = null;
function data(): EmojiData {
	// Loaded on first use so the 400 KB table stays out of app start-up.
	raw ??= require("../assets/emoji/emoji-data.json") as EmojiData;
	return raw;
}

/**
 * Newest Emoji version the system font draws. Newer ones would show up as
 * empty boxes, so the picker leaves them out (the website does the same by
 * testing the font).
 */
export function supportedEmojiVersion(
	os: string = Platform.OS,
	version: string | number = Platform.Version,
): number {
	const v = typeof version === "number" ? version : Number.parseFloat(version);
	if (os === "ios") {
		if (v >= 18.4) return 16;
		if (v >= 17.4) return 15.1;
		if (v >= 16.4) return 15;
		if (v >= 15.4) return 14;
		return 13.1;
	}
	if (os === "android") {
		// Platform.Version is the API level here.
		if (v >= 36) return 16;
		if (v >= 35) return 15.1;
		if (v >= 34) return 15;
		if (v >= 33) return 14;
		return 13.1;
	}
	return 15;
}

const cache = new Map<string, EmojiSet>();

export function emojiSet(
	locale: string,
	maxVersion = supportedEmojiVersion(),
): EmojiSet {
	const lang = locale.split("-")[0];
	const key = `${lang}:${maxVersion}`;
	const hit = cache.get(key);
	if (hit) return hit;
	const d = data();
	const words = d.locales[lang] ?? d.locales.en;
	const byGroup = new Map<number, Emoji[]>();
	d.emojis.forEach(([emoji, group, version, skins], i) => {
		if (version > maxVersion) return;
		const label = words.labels[i] ?? "";
		const entry: Emoji = {
			emoji,
			label,
			search: `${label} ${words.tags[i] ?? ""}`.toLowerCase(),
			skins,
		};
		const list = byGroup.get(group);
		if (list) list.push(entry);
		else byGroup.set(group, [entry]);
	});
	const set: EmojiSet = {
		categories: d.groups
			.map((group) => ({
				group,
				label: words.groups[String(group)] ?? "",
				emojis: byGroup.get(group) ?? [],
			}))
			.filter((c) => c.emojis.length > 0),
		skinToneLabels: ["", ...words.skinTones],
	};
	cache.set(key, set);
	return set;
}

/** The emoji in the chosen skin tone, when it comes in tones. */
export function withSkinTone(e: Emoji, tone: SkinTone): string {
	if (tone === "none" || !e.skins) return e.emoji;
	return e.skins[SKIN_TONES.indexOf(tone) - 1] ?? e.emoji;
}

/** Label matches first, then tag matches, like the website's picker. */
export function searchEmoji(set: EmojiSet, query: string): Emoji[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	const scored: { e: Emoji; score: number }[] = [];
	for (const c of set.categories) {
		for (const e of c.emojis) {
			if (!e.search.includes(q)) continue;
			scored.push({ e, score: e.label.toLowerCase().includes(q) ? 2 : 1 });
		}
	}
	return scored.sort((a, b) => b.score - a.score).map((s) => s.e);
}
