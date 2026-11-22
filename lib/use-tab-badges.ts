import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSession } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

// Unread counts per tab route name. Shares its query (and cache entry) with the
// header bell, so this adds no extra request.
export function useTabBadges(): Record<string, number> {
	const { data: session } = useSession();
	const unread = useQuery({
		...orpc.notification.unreadCount.queryOptions(),
		enabled: !!session,
		staleTime: 30_000,
		refetchInterval: 5 * 60_000,
	});
	const notifications = session ? (unread.data?.count ?? 0) : 0;
	return useMemo(() => ({ menu: notifications }), [notifications]);
}
