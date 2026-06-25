import { FlashList } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { type Href, router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, RefreshControl, View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import { Flag } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { useTheme } from "@/lib/theme/provider";
import { usePlatformPermissions } from "@/lib/use-permissions";
import { cn } from "@/lib/utils";

const STATUSES = ["open", "reviewing", "resolved", "dismissed"] as const;
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

export default function AdminReports() {
	const { t } = useI18n();
	const { colors } = useTheme();
	const { can } = usePlatformPermissions();
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<Status | undefined>("open");
	const [pendingId, setPendingId] = useState<string | null>(null);
	const query = useQuery(
		orpc.moderation.adminListReports.queryOptions({
			input: status ? { status } : {},
		}),
	);
	const canResolve = can("reports:resolve");

	async function setReportStatus(reportId: string, next: Status) {
		setPendingId(reportId);
		try {
			await client.moderation.adminResolveReport({ reportId, status: next });
			await queryClient.invalidateQueries({
				queryKey: orpc.moderation.adminListReports.key(),
			});
		} catch (e) {
			Alert.alert(t("reports.updateFailed"), humanizeError(e));
		} finally {
			setPendingId(null);
		}
	}

	if (query.isLoading) {
		return (
			<View className="bg-background flex-1 gap-3 p-4">
				{[0, 1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-28 w-full" />
				))}
			</View>
		);
	}

	if (query.isError) {
		return (
			<EmptyState
				icon={Flag}
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
								label={t(`reports.filter.${s}`)}
								active={status === s}
								onPress={() => setStatus(s)}
							/>
						))}
					</View>
				}
				renderItem={({ item }) => (
					<GlowCard accent="none" className="gap-2 rounded-3xl p-4">
						<View className="flex-row items-center gap-2">
							<Badge variant="tonal">
								{t(`reports.type.${item.targetType}`)}
							</Badge>
							<Badge
								variant={item.status === "open" ? "gradient" : "secondary"}
							>
								{t(`reports.filter.${item.status}`)}
							</Badge>
						</View>
						{item.target ? (
							item.target.href ? (
								<Pressable
									onPress={() => router.push(item.target?.href as Href)}
									accessibilityRole="link"
									accessibilityLabel={item.target.label}
								>
									<Text variant="large" className="text-primary">
										{item.target.label}
									</Text>
								</Pressable>
							) : (
								<Text variant="large">{item.target.label}</Text>
							)
						) : null}
						<Text className="text-foreground text-sm">{item.reason}</Text>
						<Text variant="small" className="text-muted-foreground">
							{t("reports.by", {
								name: item.reporter?.displayName ?? item.reporter?.name ?? "?",
							})}{" "}
							·{" "}
							{formatDistanceToNow(new Date(item.createdAt), {
								addSuffix: true,
							})}
						</Text>
						{canResolve &&
						(item.status === "open" || item.status === "reviewing") ? (
							<View className="flex-row gap-2 pt-1">
								{item.status === "open" ? (
									<Button
										size="sm"
										variant="outline"
										disabled={pendingId === item.id}
										onPress={() => setReportStatus(item.id, "reviewing")}
										accessibilityRole="button"
										accessibilityLabel={t("reports.markReviewing")}
									>
										<Text>{t("reports.markReviewing")}</Text>
									</Button>
								) : null}
								<Button
									size="sm"
									disabled={pendingId === item.id}
									onPress={() => setReportStatus(item.id, "resolved")}
									accessibilityRole="button"
									accessibilityLabel={t("reports.resolve")}
								>
									<Text>{t("reports.resolve")}</Text>
								</Button>
								<Button
									size="sm"
									variant="destructive"
									disabled={pendingId === item.id}
									onPress={() => setReportStatus(item.id, "dismissed")}
									accessibilityRole="button"
									accessibilityLabel={t("reports.dismiss")}
								>
									<Text>{t("reports.dismiss")}</Text>
								</Button>
							</View>
						) : null}
					</GlowCard>
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
					<EmptyState icon={Flag} title={t("reports.empty")} />
				}
			/>
		</View>
	);
}
