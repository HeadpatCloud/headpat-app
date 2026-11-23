import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";
import { useSession } from "@/lib/auth-client";
import { client, orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query";

/** Unread chat counts; shares one cache entry between the tab badge and lists. */
export function useChatUnread() {
	const { data: session } = useSession();
	return useQuery({
		...orpc.message.unreadCounts.queryOptions(),
		enabled: !!session,
		staleTime: 30_000,
	});
}

function invalidateUnread() {
	queryClient.invalidateQueries({ queryKey: orpc.message.unreadCounts.key() });
	queryClient.invalidateQueries({
		queryKey: orpc.message.myConversations.key(),
	});
}

/**
 * Marks the open chat read when it opens, whenever a newer message shows up
 * while it's open, and when the app comes back to it from the background.
 */
export function useMarkChatRead(
	conversationId: string,
	newestMessageId: string | undefined,
) {
	useEffect(() => {
		if (!conversationId || !newestMessageId) return;
		if (newestMessageId.startsWith("pending:")) return;
		client.message
			.markRead({ conversationId })
			.then(invalidateUnread)
			.catch(() => {});
	}, [conversationId, newestMessageId]);

	useEffect(() => {
		if (!conversationId) return;
		const sub = AppState.addEventListener("change", (state) => {
			if (state !== "active") return;
			client.message
				.markRead({ conversationId })
				.then(invalidateUnread)
				.catch(() => {});
		});
		return () => sub.remove();
	}, [conversationId]);
}
