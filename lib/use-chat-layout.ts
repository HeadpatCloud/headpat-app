import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import type { ChatLayout } from "@/lib/chat-layout";
import { useI18n } from "@/lib/i18n/provider";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

export type RailServer = Awaited<
	ReturnType<typeof client.sidebarLayout.get>
>["servers"][number];

const SAVE_DELAY_MS = 500;

/**
 * The user's server rail: followed communities and how they're arranged in
 * folders, shared with the website. Edits apply at once and are saved shortly
 * after, so a burst of moves is one request; a failed save rolls back to what
 * the server has.
 */
export function useChatLayout() {
	const { t } = useI18n();
	const qc = useQueryClient();
	const options = orpc.sidebarLayout.get.queryOptions({ input: undefined });
	const query = useQuery(options);
	const servers = useMemo(
		() => query.data?.servers ?? [],
		[query.data?.servers],
	);

	const [layout, setLayout] = useState<ChatLayout>({ items: [] });
	// Local edits that haven't been saved yet win over refetched data.
	const pending = useRef(false);
	useEffect(() => {
		if (query.data && !pending.current) setLayout({ items: query.data.items });
	}, [query.data]);

	const save = useMutation({
		mutationFn: (items: ChatLayout["items"]) =>
			client.sidebarLayout.save({ items }),
		onSuccess: (_res, items) => {
			pending.current = false;
			qc.setQueryData(options.queryKey, (old) =>
				old ? { ...old, items } : old,
			);
		},
		onError: (e) => {
			pending.current = false;
			Alert.alert(t("common.error"), humanizeError(e));
			qc.invalidateQueries({ queryKey: options.queryKey });
		},
	});

	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	useEffect(() => () => clearTimeout(timer.current), []);
	const commit = useCallback(
		(next: ChatLayout) => {
			setLayout(next);
			pending.current = true;
			clearTimeout(timer.current);
			timer.current = setTimeout(() => save.mutate(next.items), SAVE_DELAY_MS);
		},
		[save.mutate],
	);

	const serverById = useMemo(() => {
		const map = new Map<string, RailServer>();
		for (const s of servers) map.set(s.id, s);
		return map;
	}, [servers]);

	return { query, layout, servers, serverById, commit };
}
