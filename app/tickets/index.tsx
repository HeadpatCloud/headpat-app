import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { router } from "expo-router";
import { useRef } from "react";
import { RefreshControl, View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import { Inbox, Plus } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { GlowCard } from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { GradientText } from "@/components/ui/gradient-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { useTheme } from "@/lib/theme/provider";

const Separator = () => <View className="h-3" />;

export default function Tickets() {
	const { t } = useI18n();
	const { colors } = useTheme();
	const { data: session, isPending } = useSession();
	const query = useQuery({
		...orpc.ticket.myList.queryOptions({ input: {} }),
		enabled: !!session,
	});
	const animated = useRef(new Set<number>());

	if (!session) {
		if (isPending) return <View className="bg-background flex-1" />;
		return (
			<View className="bg-background flex-1 justify-center">
				<EmptyState
					icon={Inbox}
					title={t("account.guest.title")}
					subtitle={t("account.guest.subtitle")}
					action={{
						label: t("account.guest.signIn"),
						onPress: () => router.push("/(auth)/login"),
					}}
				/>
			</View>
		);
	}

	if (query.isLoading) {
		return (
			<View className="bg-background flex-1 gap-3 p-4">
				{[0, 1, 2, 3, 4].map((i) => (
					<Skeleton key={i} className="h-20 w-full" />
				))}
			</View>
		);
	}

	if (query.isError) {
		return (
			<EmptyState
				icon={Inbox}
				title={t("common.couldntLoad")}
				subtitle={humanizeError(query.error)}
				action={{ label: t("common.retry"), onPress: () => query.refetch() }}
			/>
		);
	}

	return (
		<View className="bg-background flex-1">
			<FlashList
				data={query.data ?? []}
				keyExtractor={(item) => item.id}
				contentContainerStyle={{ padding: 16 }}
				ItemSeparatorComponent={Separator}
				ListHeaderComponent={
					<View className="gap-1 pb-4 pt-2">
						<GradientText className="text-4xl font-extrabold leading-10 tracking-tight">
							{t("tickets.heading")}
						</GradientText>
						<Text variant="muted">{t("tickets.subtitle")}</Text>
					</View>
				}
				renderItem={({ item, index }) => {
					const seen = animated.current.has(index);
					if (!seen) animated.current.add(index);
					return (
						<AnimatedEntrance index={index} disabled={seen}>
							<PressableScale
								onPress={() => router.push(`/tickets/${item.id}`)}
								haptic="selection"
								accessibilityRole="button"
								accessibilityLabel={item.subject}
							>
								<GlowCard accent="none" className="gap-2 rounded-3xl p-4">
									<View className="flex-row items-start justify-between gap-2">
										<Text variant="large" className="flex-1">
											{item.subject}
										</Text>
										<Badge
											variant={
												item.status === "open" ? "gradient" : "secondary"
											}
										>
											{item.status === "open"
												? t("tickets.open")
												: t("tickets.closed")}
										</Badge>
									</View>
									<Text variant="small" className="text-muted-foreground">
										{t(`tickets.category.${item.category}`)} ·{" "}
										{formatDistanceToNow(new Date(item.lastMessageAt), {
											addSuffix: true,
										})}
									</Text>
								</GlowCard>
							</PressableScale>
						</AnimatedEntrance>
					);
				}}
				refreshControl={
					<RefreshControl
						refreshing={query.isRefetching}
						onRefresh={() => query.refetch()}
						tintColor={colors.primary}
						colors={[colors.primary]}
					/>
				}
				ListEmptyComponent={
					<EmptyState
						icon={Inbox}
						title={t("tickets.emptyTitle")}
						subtitle={t("tickets.emptySubtitle")}
					/>
				}
			/>
			<Fab
				icon={Plus}
				onPress={() => router.push("/tickets/new")}
				accessibilityLabel={t("tickets.newTicket")}
			/>
		</View>
	);
}
