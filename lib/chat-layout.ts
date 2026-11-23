// The chat server rail's layout: followed communities ("servers") at the top
// level or grouped into folders. Same shape the API stores per user
// (sidebarLayout.get / save) and the website edits by drag and drop. The app
// edits it through menus, so these helpers express each menu action as one of
// the website's drops (applyDrop is a copy of the web's sidebar-layout.ts).

export type ChatLayoutItem =
	| { type: "server"; id: string }
	| {
			type: "folder";
			id: string;
			name: string;
			color?: string;
			serverIds: string[];
	  };

export type ChatLayout = { items: ChatLayoutItem[] };

/** Where a moved rail item lands. */
export type RailDrop =
	| { kind: "top"; anchorId: string; side: "before" | "after" }
	| { kind: "top-end" }
	| {
			kind: "folder";
			folderId: string;
			anchorId: string | null;
			side: "before" | "after";
	  }
	| { kind: "combine"; targetId: string };

export const FOLDER_NAME_MAX = 64;

function removeItem(items: ChatLayoutItem[], id: string): ChatLayoutItem[] {
	return items
		.map((item) => {
			if (item.type === "server") return item.id === id ? null : item;
			if (item.id === id) return null;
			const serverIds = item.serverIds.filter((s) => s !== id);
			if (serverIds.length === 0) return null;
			return serverIds.length === item.serverIds.length
				? item
				: { ...item, serverIds };
		})
		.filter((item): item is ChatLayoutItem => item !== null);
}

function insertAt<T>(list: T[], index: number, value: T): T[] {
	const next = list.slice();
	next.splice(index, 0, value);
	return next;
}

/**
 * Moves a server or folder (`activeId`) to `drop`. Folders only move between
 * top-level slots; servers can also go into a folder or combine with another
 * top-level server into a new folder. Invalid or no-op drops return the
 * layout unchanged (same object).
 */
export function applyDrop(
	layout: ChatLayout,
	activeId: string,
	drop: RailDrop,
	opts: { makeFolderId: () => string; makeFolderName: string },
): ChatLayout {
	const activeItem = layout.items.find((i) => i.id === activeId);
	const activeIsFolder = activeItem?.type === "folder";
	const known =
		activeItem !== undefined ||
		layout.items.some(
			(i) => i.type === "folder" && i.serverIds.includes(activeId),
		);
	if (!known) return layout;
	const anchor =
		drop.kind === "top" || drop.kind === "folder"
			? drop.anchorId
			: drop.kind === "combine"
				? drop.targetId
				: null;
	if (anchor === activeId) return layout;
	if (activeIsFolder && (drop.kind === "folder" || drop.kind === "combine"))
		return layout;
	if (drop.kind === "folder" && drop.folderId === activeId) return layout;

	const moved: ChatLayoutItem =
		activeItem ?? ({ type: "server", id: activeId } as const);
	const stripped = removeItem(layout.items, activeId);

	if (drop.kind === "top-end") return { items: [...stripped, moved] };

	if (drop.kind === "top") {
		const idx = stripped.findIndex((i) => i.id === drop.anchorId);
		if (idx === -1) return layout;
		const at = drop.side === "before" ? idx : idx + 1;
		return { items: insertAt(stripped, at, moved) };
	}

	if (drop.kind === "folder") {
		const fIdx = stripped.findIndex(
			(i) => i.type === "folder" && i.id === drop.folderId,
		);
		const folder = stripped[fIdx];
		// the folder vanished because the active server was its only member
		if (folder?.type !== "folder") return layout;
		let at = 0;
		if (drop.anchorId !== null) {
			const aIdx = folder.serverIds.indexOf(drop.anchorId);
			if (aIdx === -1) return layout;
			at = drop.side === "before" ? aIdx : aIdx + 1;
		} else if (drop.side === "after") {
			at = folder.serverIds.length;
		}
		const next = stripped.slice();
		next[fIdx] = {
			...folder,
			serverIds: insertAt(folder.serverIds, at, activeId),
		};
		return { items: next };
	}

	// combine: onto a top-level server (new folder) or into a folder (append)
	const tIdx = stripped.findIndex((i) => i.id === drop.targetId);
	const target = stripped[tIdx];
	if (!target) return layout;
	const next = stripped.slice();
	next[tIdx] =
		target.type === "folder"
			? { ...target, serverIds: [...target.serverIds, activeId] }
			: {
					type: "folder",
					id: opts.makeFolderId(),
					name: opts.makeFolderName,
					serverIds: [target.id, activeId],
				};
	return { items: next };
}

/** The folder a server sits in, if any. */
export function folderOf(
	layout: ChatLayout,
	serverId: string,
): Extract<ChatLayoutItem, { type: "folder" }> | undefined {
	for (const item of layout.items)
		if (item.type === "folder" && item.serverIds.includes(serverId))
			return item;
	return undefined;
}

/**
 * The neighbours of a rail item within its own list (the top level, or the
 * folder it sits in), so a menu can offer "move up" and "move down".
 */
export function siblingsOf(
	layout: ChatLayout,
	id: string,
): { prev: string | null; next: string | null; folderId: string | null } {
	const folder = folderOf(layout, id);
	const ids = folder ? folder.serverIds : layout.items.map((i) => i.id);
	const at = ids.indexOf(id);
	return {
		prev: at > 0 ? ids[at - 1] : null,
		next: at >= 0 && at < ids.length - 1 ? ids[at + 1] : null,
		folderId: folder?.id ?? null,
	};
}

const noFolder = { makeFolderId: () => "", makeFolderName: "" };

/** Moves a server or folder one step up (-1) or down (1) in its own list. */
export function moveItem(
	layout: ChatLayout,
	id: string,
	dir: -1 | 1,
): ChatLayout {
	const { prev, next, folderId } = siblingsOf(layout, id);
	const anchor = dir === -1 ? prev : next;
	if (!anchor) return layout;
	const side = dir === -1 ? "before" : "after";
	return applyDrop(
		layout,
		id,
		folderId
			? { kind: "folder", folderId, anchorId: anchor, side }
			: { kind: "top", anchorId: anchor, side },
		noFolder,
	);
}

/** Puts a server at the end of a folder, taking it out of any other folder. */
export function moveIntoFolder(
	layout: ChatLayout,
	serverId: string,
	folderId: string,
): ChatLayout {
	return applyDrop(
		layout,
		serverId,
		{ kind: "folder", folderId, anchorId: null, side: "after" },
		noFolder,
	);
}

/** Takes a server out of its folder and puts it right below the folder. */
export function takeOutOfFolder(
	layout: ChatLayout,
	serverId: string,
): ChatLayout {
	const folder = folderOf(layout, serverId);
	if (!folder) return layout;
	// A folder can't outlive its last server: dissolving it leaves the server
	// in the folder's place.
	if (folder.serverIds.length === 1) return removeFolder(layout, folder.id);
	return applyDrop(
		layout,
		serverId,
		{ kind: "top", anchorId: folder.id, side: "after" },
		noFolder,
	);
}

/**
 * Wraps a server in a new folder of its own, in the server's place. A server
 * already in a folder moves out first, so the new folder sits below the old one.
 */
export function newFolderWith(
	layout: ChatLayout,
	serverId: string,
	folder: { id: string; name: string },
): ChatLayout {
	const base = folderOf(layout, serverId)
		? takeOutOfFolder(layout, serverId)
		: layout;
	const idx = base.items.findIndex(
		(i) => i.type === "server" && i.id === serverId,
	);
	if (idx === -1) return layout;
	const items = base.items.slice();
	items[idx] = {
		type: "folder",
		id: folder.id,
		name: folder.name.trim().slice(0, FOLDER_NAME_MAX),
		serverIds: [serverId],
	};
	return { items };
}

export function renameFolder(
	layout: ChatLayout,
	folderId: string,
	name: string,
): ChatLayout {
	const trimmed = name.trim().slice(0, FOLDER_NAME_MAX);
	if (!trimmed) return layout;
	return {
		items: layout.items.map((i) =>
			i.type === "folder" && i.id === folderId ? { ...i, name: trimmed } : i,
		),
	};
}

/** Dissolves a folder; its servers take its place instead of jumping down. */
export function removeFolder(layout: ChatLayout, folderId: string): ChatLayout {
	const idx = layout.items.findIndex(
		(i) => i.type === "folder" && i.id === folderId,
	);
	const folder = layout.items[idx];
	if (folder?.type !== "folder") return layout;
	const items = layout.items.slice();
	items.splice(
		idx,
		1,
		...folder.serverIds.map((id) => ({ type: "server" as const, id })),
	);
	return { items };
}
