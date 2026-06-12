import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import { Inbox } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { GlowCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { useTheme } from "@/lib/theme/provider";
import { cn } from "@/lib/utils";

const STATUSES = ["open", "closed"] as const;
type Status = (typeof STATUSES)[number];

const Separator = () => <View className="h-3" />;

function FilterChip({
	label,
	active,
	onPress,
}: {
	label: string;
	active: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityState={{ selected: active }}
			className={cn(
				"rounded-full border px-3 py-1.5",
				active ? "border-primary bg-primary/15" : "border-border",
			)}
		>
			<Text
				className={cn(
					"text-xs font-medium",
					active ? "text-primary" : "text-muted-foreground",
				)}
			>
				{label}
			</Text>
		</Pressable>
	);
}

export default function AdminTickets() {
	const { t } = useI18n();
	const { colors } = useTheme();
	const [status, setStatus] = useState<Status | undefined>("open");
	const query = useQuery(
		orpc.ticket.adminList.queryOptions({
			input: status ? { status } : {},
		}),
	);

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
					<View className="flex-row flex-wrap gap-2 pb-4">
						<FilterChip
							label={t("common.all")}
							active={status === undefined}
							onPress={() => setStatus(undefined)}
						/>
						{STATUSES.map((s) => (
							<FilterChip
								key={s}
								label={t(`tickets.${s}`)}
								active={status === s}
								onPress={() => setStatus(s)}
							/>
						))}
					</View>
				}
				renderItem={({ item }) => (
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
									variant={item.status === "open" ? "gradient" : "secondary"}
								>
									{item.status === "open"
										? t("tickets.open")
										: t("tickets.closed")}
								</Badge>
							</View>
							<Text variant="small" className="text-muted-foreground">
								{item.author?.displayName ?? item.author?.name ?? "?"} ·{" "}
								{t(`tickets.category.${item.category}`)} ·{" "}
								{formatDistanceToNow(new Date(item.lastMessageAt), {
									addSuffix: true,
								})}
							</Text>
						</GlowCard>
					</PressableScale>
				)}
				refreshControl={
					<RefreshControl
						refreshing={query.isRefetching}
						onRefresh={() => query.refetch()}
						tintColor={colors.primary}
						colors={[colors.primary]}
					/>
				}
				ListEmptyComponent={
					<EmptyState icon={Inbox} title={t("tickets.emptyTitle")} />
				}
			/>
		</View>
	);
}
