import {
	type ChatLayout,
	moveIntoFolder,
	moveItem,
	newFolderWith,
	removeFolder,
	renameFolder,
	siblingsOf,
	takeOutOfFolder,
} from "@/lib/chat-layout";

const s = (id: string) => ({ type: "server" as const, id });
const f = (id: string, serverIds: string[], name = "Folder") => ({
	type: "folder" as const,
	id,
	name,
	serverIds,
});

const base: ChatLayout = {
	items: [s("a"), f("F", ["b", "c"]), s("d")],
};

describe("siblingsOf", () => {
	it("looks at the top level for top-level items", () => {
		expect(siblingsOf(base, "F")).toEqual({
			prev: "a",
			next: "d",
			folderId: null,
		});
		expect(siblingsOf(base, "a").prev).toBeNull();
		expect(siblingsOf(base, "d").next).toBeNull();
	});

	it("looks inside the folder for servers in a folder", () => {
		expect(siblingsOf(base, "b")).toEqual({
			prev: null,
			next: "c",
			folderId: "F",
		});
	});
});

describe("moveItem", () => {
	it("moves top-level items, folders included", () => {
		expect(moveItem(base, "d", -1).items.map((i) => i.id)).toEqual([
			"a",
			"d",
			"F",
		]);
		expect(moveItem(base, "F", -1).items.map((i) => i.id)).toEqual([
			"F",
			"a",
			"d",
		]);
	});

	it("moves servers within their folder", () => {
		expect(moveItem(base, "c", -1).items[1]).toEqual(f("F", ["c", "b"]));
	});

	it("leaves the layout alone at either end", () => {
		expect(moveItem(base, "a", -1)).toBe(base);
		expect(moveItem(base, "c", 1)).toBe(base);
	});
});

describe("folders", () => {
	it("moves a server into a folder at its end", () => {
		expect(moveIntoFolder(base, "a", "F").items).toEqual([
			f("F", ["b", "c", "a"]),
			s("d"),
		]);
	});

	it("takes a server out to just below its folder", () => {
		expect(takeOutOfFolder(base, "b").items).toEqual([
			s("a"),
			f("F", ["c"]),
			s("b"),
			s("d"),
		]);
	});

	it("dissolves the folder when its last server leaves", () => {
		const one: ChatLayout = { items: [s("a"), f("F", ["b"]), s("d")] };
		expect(takeOutOfFolder(one, "b").items).toEqual([s("a"), s("b"), s("d")]);
	});

	it("wraps a server in a new folder in its place", () => {
		expect(newFolderWith(base, "d", { id: "G", name: " New " }).items).toEqual([
			s("a"),
			f("F", ["b", "c"]),
			f("G", ["d"], "New"),
		]);
	});

	it("moves a foldered server out before wrapping it", () => {
		expect(newFolderWith(base, "b", { id: "G", name: "New" }).items).toEqual([
			s("a"),
			f("F", ["c"]),
			f("G", ["b"], "New"),
			s("d"),
		]);
	});

	it("renames, ignoring blank names", () => {
		expect(renameFolder(base, "F", "  Pals ").items[1]).toEqual(
			f("F", ["b", "c"], "Pals"),
		);
		expect(renameFolder(base, "F", "   ")).toBe(base);
	});

	it("removes a folder, leaving its servers in its place", () => {
		expect(removeFolder(base, "F").items).toEqual([
			s("a"),
			s("b"),
			s("c"),
			s("d"),
		]);
	});
});
