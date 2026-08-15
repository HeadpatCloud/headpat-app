import { persistedCollectionOptions } from "@tanstack/expo-db-sqlite-persistence";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
	createCollection,
	localOnlyCollectionOptions,
} from "@tanstack/react-db";
import { persistence } from "@/lib/db/persistence";
import { type client, orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query";

export type GalleryRow = Awaited<
	ReturnType<typeof client.gallery.list>
>["items"][number];
export type ProfileRow = Awaited<ReturnType<typeof client.profile.byUrl>>;

// byId returns a list row plus author + likedByMe, so one row type serves both
// the grids (list-shaped) and the detail screen (byId-shaped).
export type GalleryPostRow = GalleryRow &
	Partial<
		Pick<
			Awaited<ReturnType<typeof client.gallery.byId>>,
			"author" | "likedByMe"
		>
	>;

// Matches the gallery screen's own page size, so the offline set is exactly the
// first page a user would otherwise see.
export const RECENT_PAGE_SIZE = 24;

const galleryQueryOptions = queryCollectionOptions<GalleryRow>({
	id: "gallery-recent",
	queryKey: ["db", "gallery", "recent"],
	queryClient,
	queryFn: async () => {
		const page = await orpc.gallery.list.call({
			page: 1,
			pageSize: RECENT_PAGE_SIZE,
		});
		return page.items;
	},
	getKey: (item) => item.id,
});

/**
 * Recent gallery items, synced through the existing query client and persisted
 * to SQLite. The gallery screen still pages with infiniteOptions while online;
 * this collection is what it reads when there's no network.
 */
// persistedCollectionOptions and createCollection don't compose generically in
// these versions: with no standard-schema validator the former widens TSchema to
// StandardSchemaV1 while the latter's schemaless overload demands undefined.
// This call shape is the one the adapter documents, so the runtime object is
// correct and only inference disagrees — the SQLite smoke test is what actually
// proves it.
export const galleryCollection = persistence
	? createCollection(
			persistedCollectionOptions({
				...galleryQueryOptions,
				persistence,
				schemaVersion: 1,
			}) as unknown as typeof galleryQueryOptions,
		)
	: createCollection(galleryQueryOptions);

export type EventRow = Awaited<
	ReturnType<typeof client.event.list>
>["items"][number];

const eventQueryOptions = queryCollectionOptions<EventRow>({
	id: "events-upcoming",
	queryKey: ["db", "event", "upcoming"],
	queryClient,
	queryFn: async () => {
		const page = await orpc.event.list.call({
			page: 1,
			pageSize: RECENT_PAGE_SIZE,
		});
		return page.items;
	},
	getKey: (row) => row.id,
});

/**
 * Upcoming events. list and byId are both bare selects off the same table, so one
 * collection serves the list screen and the detail screen — no mirror needed.
 */
export const eventCollection = persistence
	? createCollection(
			persistedCollectionOptions({
				...eventQueryOptions,
				persistence,
				schemaVersion: 1,
			}) as unknown as typeof eventQueryOptions,
		)
	: createCollection(eventQueryOptions);

/**
 * Offline mirror of individually-fetched profiles. profile.byUrl returns one
 * entity at a time, so there is nothing to sync wholesale — the query layer
 * upserts into this local-only collection on each success instead.
 */
export const profileCollection = createCollection(
	persistence
		? persistedCollectionOptions<ProfileRow, string>({
				id: "profiles",
				getKey: (row) => row.userId,
				persistence,
				schemaVersion: 1,
			})
		: localOnlyCollectionOptions<ProfileRow, string>({
				id: "profiles",
				getKey: (row) => row.userId,
			}),
);

/**
 * Individually-fetched gallery posts: the per-user profile grids and post detail.
 * Deliberately separate from galleryCollection — that one is a query-db
 * collection, so its queryFn result IS its whole contents and any row written in
 * from elsewhere gets reconciled away on the next feed refetch. Fed only by
 * gallery.byId and by list calls carrying a userId, never by the global feed.
 */
export const galleryPostCollection = createCollection(
	persistence
		? persistedCollectionOptions<GalleryPostRow, string>({
				id: "gallery-posts",
				getKey: (row) => row.id,
				persistence,
				schemaVersion: 1,
			})
		: localOnlyCollectionOptions<GalleryPostRow, string>({
				id: "gallery-posts",
				getKey: (row) => row.id,
			}),
);

// Merge rather than replace: a list row carries no author/likedByMe and must not
// blank out what an earlier byId fetch stored.
export function cacheGalleryPost(row: GalleryPostRow) {
	if (galleryPostCollection.has(row.id)) {
		galleryPostCollection.update(row.id, (draft) => {
			Object.assign(draft, row);
		});
		return;
	}
	galleryPostCollection.insert(row);
}

export function cacheGalleryPosts(rows: GalleryPostRow[]) {
	for (const row of rows) cacheGalleryPost(row);
}

export function forgetGalleryPost(id: string) {
	if (galleryPostCollection.has(id)) galleryPostCollection.delete(id);
}

export function cacheProfile(row: ProfileRow) {
	if (profileCollection.has(row.userId)) {
		profileCollection.update(row.userId, (draft) => {
			Object.assign(draft, row);
		});
		return;
	}
	profileCollection.insert(row);
}

/**
 * Empties every collection in place. Deliberately not cleanup(): tearing a
 * collection down while a mounted screen's live query still depends on it breaks
 * that query ("Source collection was manually cleaned up while live query
 * depends on it"). Emptying keeps the collections alive, so the gallery and
 * events screens just observe an empty set and refill on their next fetch.
 */
export function clearCollections() {
	// writeDelete goes straight to the synced store, so no delete is sent to the
	// server the way collection.delete() would for a synced collection.
	galleryCollection.utils.writeDelete([...galleryCollection.keys()]);
	eventCollection.utils.writeDelete([...eventCollection.keys()]);

	// Local-only mirrors have no server to notify.
	for (const key of [...galleryPostCollection.keys()]) {
		galleryPostCollection.delete(key);
	}
	for (const key of [...profileCollection.keys()]) {
		profileCollection.delete(key);
	}
}
