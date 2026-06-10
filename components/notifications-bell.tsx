import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { View } from "react-native";
import { CountBadge } from "@/components/count-badge";
import { Bell } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { orpc } from "@/lib/orpc";

// Header bell with unread badge. The count polls quietly in the background;
// a failing count query just means no badge (ambient state, never an error UI).
export function NotificationsBell() {
	const { t } = useI18n();
	const { data: session } = useSession();
	const unread = useQuery({
		...orpc.notification.unreadCount.queryOptions(),
		enabled: !!session,
		staleTime: 30_000,
		refetchInterval: 60_000,
	});
	const count = session ? (unread.data?.count ?? 0) : 0;

	if (!session) return null;

	return (
		<PressableScale
			haptic="selection"
			hitSlop={8}
			onPress={() => router.push("/notifications")}
			accessibilityRole="button"
			accessibilityLabel={
				count > 0
					? t("notifications.bellUnread", { count })
					: t("notifications.title")
			}
		>
			<View className="h-10 w-10 items-center justify-center rounded-full">
				<Icon as={Bell} size={20} className="text-foreground" />
				<View className="absolute -right-1 -top-1">
					<CountBadge count={count} />
				</View>
			</View>
		</PressableScale>
	);
}
