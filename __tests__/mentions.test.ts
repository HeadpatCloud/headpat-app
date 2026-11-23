import {
	mentionHandles,
	parseMentions,
	profileLinkHandle,
} from "@/lib/mentions";

const mentions = (text: string) =>
	parseMentions(text)
		.filter((p) => p.kind === "mention")
		.map((p) => (p.kind === "mention" ? [p.text, p.handle] : []));

describe("parseMentions", () => {
	test("plain text without mentions stays one part", () => {
		expect(parseMentions("hello there")).toEqual([
			{ kind: "text", text: "hello there" },
		]);
	});

	test("finds @names and keeps the text around them", () => {
		expect(parseMentions("hi @fox, meet @wolf_2!")).toEqual([
			{ kind: "text", text: "hi " },
			{ kind: "mention", text: "@fox", handle: "fox" },
			{ kind: "text", text: ", meet " },
			{ kind: "mention", text: "@wolf_2", handle: "wolf_2" },
			{ kind: "text", text: "!" },
		]);
	});

	test("drops sentence punctuation after a name", () => {
		expect(mentions("thanks @red-panda.")).toEqual([
			["@red-panda", "red-panda"],
		]);
		expect(mentions("by @a.b.c...")).toEqual([["@a.b.c", "a.b.c"]]);
	});

	test("ignores email addresses and glued @ signs", () => {
		expect(mentions("mail me@fox.com or a/@b")).toEqual([]);
	});

	test("allows brackets and line starts before @", () => {
		expect(mentions("@first (@second)\n@third")).toEqual([
			["@first", "first"],
			["@second", "second"],
			["@third", "third"],
		]);
	});

	test("finds full profile links on both hosts and with a locale", () => {
		expect(
			mentions(
				"see https://headpat.place/user/fox and http://www.headpat.app/de/user/Wolf/.",
			),
		).toEqual([
			["https://headpat.place/user/fox", "fox"],
			["http://www.headpat.app/de/user/Wolf/", "Wolf"],
		]);
	});

	test("decodes percent-encoded profile links", () => {
		expect(mentions("https://headpat.place/user/f%C3%BCchsin")).toEqual([
			["https://headpat.place/user/f%C3%BCchsin", "füchsin"],
		]);
	});

	test("leaves links to other pages and other sites alone", () => {
		expect(
			mentions(
				"https://headpat.place/user/fox/followers https://headpat.place/user/fox?x=1 https://example.com/user/fox",
			),
		).toEqual([]);
	});

	test("drops trailing punctuation from links", () => {
		expect(mentions("(https://headpat.place/user/fox)!")).toEqual([
			["https://headpat.place/user/fox", "fox"],
		]);
		expect(mentions("go to https://headpat.place/user/fox.")).toEqual([
			["https://headpat.place/user/fox", "fox"],
		]);
	});

	test("rebuilds the original text exactly", () => {
		const text = "a @b c https://headpat.place/user/d. e@f.g @h";
		expect(
			parseMentions(text)
				.map((p) => p.text)
				.join(""),
		).toBe(text);
	});
});

describe("mentionHandles", () => {
	test("lists each handle once in order", () => {
		expect(
			mentionHandles(parseMentions("@a @b @a https://headpat.place/user/c")),
		).toEqual(["a", "b", "c"]);
	});
});

describe("profileLinkHandle", () => {
	test("returns the handle of a profile link only", () => {
		expect(profileLinkHandle("https://headpat.place/en/user/fox")).toBe("fox");
		expect(profileLinkHandle("@fox")).toBeNull();
		expect(profileLinkHandle("https://headpat.place/gallery/1")).toBeNull();
	});
});
