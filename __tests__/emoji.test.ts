import {
	emojiSet,
	searchEmoji,
	supportedEmojiVersion,
	withSkinTone,
} from "@/lib/emoji";

describe("supportedEmojiVersion", () => {
	it("follows the OS release that added each Emoji version", () => {
		expect(supportedEmojiVersion("ios", "18.4")).toBe(16);
		expect(supportedEmojiVersion("ios", "17.5")).toBe(15.1);
		expect(supportedEmojiVersion("ios", "15.0")).toBe(13.1);
		expect(supportedEmojiVersion("android", 36)).toBe(16);
		expect(supportedEmojiVersion("android", 34)).toBe(15);
		expect(supportedEmojiVersion("android", 29)).toBe(13.1);
	});
});

describe("emojiSet", () => {
	it("has every category but the skin tone components, in order", () => {
		const set = emojiSet("en", 16);
		expect(set.categories.map((c) => c.group)).toEqual([
			0, 1, 3, 4, 5, 6, 7, 8, 9,
		]);
		expect(set.categories[0].emojis[0].emoji).toBe("😀");
		expect(set.skinToneLabels).toHaveLength(6);
	});

	it("leaves out emoji newer than the font", () => {
		const all = emojiSet("en", 16).categories.flatMap((c) => c.emojis);
		const old = emojiSet("en", 13.1).categories.flatMap((c) => c.emojis);
		expect(old.length).toBeLessThan(all.length);
		expect(old.some((e) => e.emoji === "🫠")).toBe(false);
		expect(all.some((e) => e.emoji === "🫠")).toBe(true);
	});

	it("uses the app language for labels and categories", () => {
		const de = emojiSet("de", 16);
		expect(de.categories[0].label).toBe("Smileys & Emotionen");
		const nl = emojiSet("nl-NL", 16);
		expect(nl.categories[0].label).not.toBe(de.categories[0].label);
	});
});

describe("searchEmoji", () => {
	it("finds by label and tag, label hits first", () => {
		const set = emojiSet("en", 16);
		const hits = searchEmoji(set, "paw");
		expect(hits[0].emoji).toBe("🐾");
		expect(searchEmoji(set, "  ")).toEqual([]);
	});

	it("searches in the app language", () => {
		const hits = searchEmoji(emojiSet("de", 16), "katze");
		expect(hits.map((e) => e.emoji)).toContain("🐱");
	});
});

describe("withSkinTone", () => {
	it("swaps in the tone variant only when there is one", () => {
		const set = emojiSet("en", 16);
		const wave = searchEmoji(set, "waving hand")[0];
		expect(withSkinTone(wave, "none")).toBe("👋");
		expect(withSkinTone(wave, "dark")).toBe("👋🏿");
		const cat = searchEmoji(set, "cat face")[0];
		expect(withSkinTone(cat, "dark")).toBe(cat.emoji);
	});
});
