import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { orpc } from "@/lib/orpc";

type Kind = "gallery" | "avatar" | "banner";

// Must match StorageImage's input exactly, or the seeded entry lands under a
// different key and every cell refetches anyway.
const EXPIRY_SEC = 3600;

/**
 * Resolves a whole page of presigned URLs in one request and writes each result
 * into the cache entry the matching StorageImage would otherwise fetch itself.
 *
 * A grid mounts one StorageImage per cell, each with its own query, so a 24-item
 * page meant 24 round trips. Seeding leaves StorageImage untouched: its useQuery
 * simply finds fresh data.
 */
export function useStorageUrls(
	kind: Kind,
	fileIds: (string | null | undefined)[],
	variant?: string,
) {
	const queryClient = useQueryClient();
	const ids = [...new Set(fileIds.filter((id): id is string => !!id))].sort();

	const { data } = useQuery({
		...orpc.storage.urls.queryOptions({
			input: {
				kind,
				fileIds: ids,
				expirySec: EXPIRY_SEC,
				...(variant ? { variant } : {}),
			},
		}),
		enabled: ids.length > 0,
		staleTime: 50 * 60 * 1000,
		retry: 2,
	});

	useEffect(() => {
		if (!data) return;
		for (const item of data.items) {
			queryClient.setQueryData(
				orpc.storage.url.key({
					input: {
						kind,
						fileId: item.fileId,
						expirySec: EXPIRY_SEC,
						...(variant ? { variant } : {}),
					},
				}),
				{ url: item.url, key: item.key, blurHash: item.blurHash },
			);
		}
	}, [data, kind, variant, queryClient]);
}
