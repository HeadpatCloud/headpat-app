import { defaultShouldDehydrateQuery } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import { persister, queryClient } from "@/lib/query";

// oRPC query keys are [path[], {input, type}], so these match on the path.
// Prefixes, not roots: a bare "profile" test would also strip profile.me, which
// feeds nsfwAllowed and the theme provider.
const NEVER_PERSIST: string[][] = [
	// Presigned storage URLs expire in minutes — persisting them just bloats the
	// startup restore and hydrates dead URLs.
	["storage"],
	// A fresh random shuffle seed per visit is part of the input, so every
	// persisted page is a key that will never be read again.
	["profile", "list"],
	// staleTime 0 means these never refetch offline, so a rehydrated pin would
	// outlive the share being revoked, paused or expired.
	["location", "visibleLocations"],
	// Online status is a live check; a restored green dot is a false statement.
	["presence", "getMany"],
	// Owned by SQLite collections, which now have read paths on every screen that
	// used them. byId payloads stay persisted: gallery.byId carries author and
	// likedByMe, and no collection holds those.
	["gallery", "list"],
	["profile", "byUrl"],
	["event", "list"],
];

function isNeverPersisted(queryKey: readonly unknown[]): boolean {
	// Collections observe the shared query client under a flat ["db", …] key, so
	// their rows would otherwise be written to both SQLite and this blob.
	if (queryKey[0] === "db") return true;
	const path = queryKey[0];
	if (!Array.isArray(path)) return false;
	return NEVER_PERSIST.some((prefix) =>
		prefix.every((segment, i) => path[i] === segment),
	);
}

export function AppProviders({ children }: { children: ReactNode }) {
	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{
				persister,
				dehydrateOptions: {
					shouldDehydrateQuery: (query) =>
						defaultShouldDehydrateQuery(query) &&
						!isNeverPersisted(query.queryKey),
				},
			}}
		>
			{children}
		</PersistQueryClientProvider>
	);
}
