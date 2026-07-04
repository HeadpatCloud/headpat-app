import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns/format";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import { GlowAvatar } from "@/components/glow-avatar";
import { CalendarDays, MapPin, Users } from "@/components/icons";
import { StorageImage } from "@/components/storage-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { useTheme } from "@/lib/theme/provider";
import { usePlatformPermissions } from "@/lib/use-permissions";

export default function Community() {
	const { communityId } = useLocalSearchParams<{ communityId: string }>();
	const queryClient = useQueryClient();
	const { t } = useI18n();
	const { colors } = useTheme();
	const { data: session } = useSession();
	const { can } = usePlatformPermissions();
	const [busy, setBusy] = useState(false);

	const community = useQuery(
		orpc.community.byId.queryOptions({ input: { communityId } }),
	);
	const myRole = useQuery({
		...orpc.community.myRoleIn.queryOptions({ input: { communityId } }),
		enabled: !!session,
	});
	const followStatus = useQuery({
		...orpc.community.followStatus.queryOptions({ input: { communityId } }),
		enabled: !!session,
	});
	const events = useQuery(
		orpc.event.listByCommunity.queryOptions({ input: { communityId } }),
	);

	async function toggleFollow() {
		if (!session) {
			router.push("/(auth)/login");
			return;
		}
		if (busy) return;
		setBusy(true);
		const statusKey = orpc.community.followStatus.queryOptions({
			input: { communityId },
		}).queryKey;
		const byIdKey = orpc.community.byId.queryOptions({
			input: { communityId },
		}).queryKey;
		await Promise.all([
			queryClient.cancelQueries({ queryKey: statusKey }),
			queryClient.cancelQueries({ queryKey: byIdKey }),
		]);
		const prevStatus = queryClient.getQueryData(statusKey);
		const prevById = queryClient.getQueryData(byIdKey);
		const wasFollowing = followStatus.data?.iFollow ?? false;
		queryClient.setQueryData(
			statusKey,
			(old) => old && { ...old, iFollow: !wasFollowing },
		);
		queryClient.setQueryData(
			byIdKey,
			(old) =>
				old && {
					...old,
					followersCount: Math.max(
						old.followersCount + (wasFollowing ? -1 : 1),
						0,
					),
				},
		);
		try {
			if (wasFollowing) {
				await client.community.unfollow({ communityId });
			} else {
				await client.community.follow({ communityId });
			}
		} catch (e) {
			queryClient.setQueryData(statusKey, prevStatus);
			queryClient.setQueryData(byIdKey, prevById);
			Alert.alert(t("community.detail.followErrorTitle"), humanizeError(e));
		} finally {
			queryClient.invalidateQueries({
				queryKey: orpc.community.followStatus.key({ input: { communityId } }),
			});
			queryClient.invalidateQueries({
				queryKey: orpc.community.byId.key({ input: { communityId } }),
			});
			setBusy(false);
		}
	}

	if (community.isLoading) {
		return (
			<View className="bg-background flex-1">
				<Skeleton className="h-40 w-full rounded-none" />
				<View className="gap-3 p-4">
					<Skeleton className="h-8 w-2/3" />
					<Skeleton className="h-20 w-full" />
				</View>
			</View>
		);
	}

	if (!community.data) {
		return (
			<View className="bg-background flex-1 justify-center">
				<EmptyState
					icon={Users}
					title={t("community.detail.goneTitle")}
					subtitle={t("community.detail.goneSubtitle")}
				/>
			</View>
		);
	}

	const c = community.data;
	const iFollow = followStatus.data?.iFollow ?? false;
	const role = myRole.data?.role;
	const canManage =
		role === "admin" ||
		role === "moderator" ||
		role === "owner" ||
		can("communities:edit");

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{ paddingBottom: 32 }}
		>
			<AnimatedEntrance index={0} preset="fade">
				<View style={{ height: 160 }}>
					{c.bannerFileId ? (
						<StorageImage
							kind="community-banner"
							fileId={c.bannerFileId}
							variant="1600"
							style={StyleSheet.absoluteFill}
							accessibilityLabel={t("community.detail.banner", {
								name: c.name,
							})}
						/>
					) : (
						<Gradient style={StyleSheet.absoluteFill} />
					)}
					<Gradient
						colors={["transparent", colors.background]}
						start={{ x: 0, y: 0 }}
						end={{ x: 0, y: 1 }}
						locations={[0.55, 1]}
						style={StyleSheet.absoluteFill}
						pointerEvents="none"
					/>
				</View>
			</AnimatedEntrance>

			<View className="gap-4 p-4">
				<AnimatedEntrance index={1}>
					<View className="flex-row items-center gap-3">
						<GlowAvatar
							fileId={c.avatarFileId}
							name={c.name}
							kind="community-avatar"
							size={64}
							className="-mt-12"
						/>
						<View className="flex-1 gap-0.5">
							<Text variant="h2">{c.name}</Text>
							<View className="flex-row items-center gap-1.5">
								<Icon as={Users} size={14} className="text-muted-foreground" />
								<Text variant="small" className="text-muted-foreground">
									{t("community.detail.followersCount", {
										count: c.followersCount,
									})}
								</Text>
							</View>
						</View>
					</View>
				</AnimatedEntrance>

				<AnimatedEntrance index={2} className="gap-3">
					<Button
						variant={iFollow ? "outline" : "default"}
						onPress={toggleFollow}
						disabled={!!session && followStatus.isLoading}
						accessibilityRole="button"
						accessibilityLabel={
							iFollow
								? t("community.detail.unfollowCommunity")
								: t("community.detail.followCommunity")
						}
					>
						<Text>
							{iFollow
								? t("community.detail.following")
								: t("community.detail.follow")}
						</Text>
					</Button>

					{canManage ? (
						<Button
							variant="outline"
							onPress={() => router.push(`/community-admin/${communityId}`)}
							accessibilityRole="button"
							accessibilityLabel={t("community.detail.manageCommunity")}
						>
							<Text>{t("community.detail.manage")}</Text>
						</Button>
					) : null}
				</AnimatedEntrance>

				{c.description || c.tags.length > 0 ? (
					<AnimatedEntrance index={3} className="gap-4">
						{c.description ? (
							<Text className="text-foreground leading-6">{c.description}</Text>
						) : null}

						{c.tags.length > 0 ? (
							<View className="flex-row flex-wrap gap-1.5">
								{c.tags.map((tag) => (
									<Badge key={tag} variant="secondary">
										{tag}
									</Badge>
								))}
							</View>
						) : null}
					</AnimatedEntrance>
				) : null}

				<AnimatedEntrance index={4} className="gap-2 pt-2">
					<SectionHeader title={t("community.detail.events")} accent />
					{events.isLoading ? (
						<Skeleton className="h-20 w-full" />
					) : events.data && events.data.length > 0 ? (
						events.data.map((e) => (
							<PressableScale
								key={e.id}
								haptic="selection"
								onPress={() => router.push(`/event/${e.id}`)}
								accessibilityRole="button"
								accessibilityLabel={e.title}
							>
								<Card className="gap-1.5 p-4">
									<Text variant="large" numberOfLines={1}>
										{e.title}
									</Text>
									<View className="flex-row items-center gap-1.5">
										<Icon
											as={CalendarDays}
											size={14}
											className="text-muted-foreground"
										/>
										<Text variant="small" className="text-muted-foreground">
											{format(new Date(e.startsAt), "PPp")}
										</Text>
									</View>
									{e.locationText ? (
										<View className="flex-row items-center gap-1.5">
											<Icon
												as={MapPin}
												size={14}
												className="text-muted-foreground"
											/>
											<Text
												variant="small"
												className="text-muted-foreground"
												numberOfLines={1}
											>
												{e.locationText}
											</Text>
										</View>
									) : null}
									<View className="flex-row items-center gap-1.5">
										<Icon
											as={Users}
											size={14}
											className="text-muted-foreground"
										/>
										<Text variant="small" className="text-muted-foreground">
											{t("community.detail.going", {
												count: e.attendeesCount,
											})}
										</Text>
									</View>
								</Card>
							</PressableScale>
						))
					) : (
						<Text variant="muted">{t("community.detail.noEvents")}</Text>
					)}
				</AnimatedEntrance>
			</View>
		</ScrollView>
	);
}
