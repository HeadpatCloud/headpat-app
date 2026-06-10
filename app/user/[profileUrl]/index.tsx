import {
	useInfiniteQuery,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { EmptyState } from "@/components/empty-state";
import {
	AtSign,
	Images,
	type LucideIcon,
	MapPin,
	MessageCircle,
	Send,
	Twitch,
	UserPen,
	UserRound,
} from "@/components/icons";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { StorageImage } from "@/components/storage-image";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlowShadow, Gradient } from "@/components/ui/gradient";
import { GradientText } from "@/components/ui/gradient-text";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { StatPill } from "@/components/ui/stat-pill";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { withAlpha } from "@/lib/theme/color";
import { RADIUS } from "@/lib/theme/foundations";
import { useTheme } from "@/lib/theme/provider";

const BANNER_H = 176;

function SocialRow({ icon, label }: { icon: LucideIcon; label: string }) {
	return (
		<View className="flex-row items-start gap-2">
			<Icon as={icon} size={16} className="text-muted-foreground mt-0.5" />
			<Text className="text-foreground flex-1">{label}</Text>
		</View>
	);
}

type GalleryItem = {
	id: string;
	name: string;
	fileId: string | null;
	blurHash: string | null;
	nsfw: boolean;
};

type GalleryQuery = {
	isLoading: boolean;
	isError: boolean;
	error: unknown;
	data?: { pages: { items: GalleryItem[] }[] };
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	fetchNextPage: () => void;
	refetch: () => void;
};

function GalleryGrid({ query }: { query: GalleryQuery }) {
	const { t } = useI18n();

	if (query.isLoading) {
		return (
			<View className="-mx-1.5 flex-row flex-wrap">
				{[0, 1, 2, 3].map((i) => (
					<View key={i} className="w-1/2 p-1.5">
						<Skeleton
							className="aspect-square w-full"
							style={{ borderRadius: RADIUS.lg }}
						/>
					</View>
				))}
			</View>
		);
	}

	if (query.isError) {
		return (
			<EmptyState
				icon={Images}
				title={t("common.couldntLoad")}
				subtitle={humanizeError(query.error)}
				action={{ label: t("common.retry"), onPress: () => query.refetch() }}
			/>
		);
	}

	const items = query.data?.pages.flatMap((p) => p.items) ?? [];

	if (items.length === 0) {
		return <EmptyState icon={Images} title={t("profile.noPosts")} />;
	}

	return (
		<View className="gap-3">
			<View className="-mx-1.5 flex-row flex-wrap">
				{items.map((item) => (
					<View key={item.id} className="w-1/2 p-1.5">
						<PressableScale
							onPress={() => router.push(`/gallery/${item.id}`)}
							haptic="selection"
							accessibilityRole="button"
							accessibilityLabel={item.name}
						>
							<View
								className="bg-card border-border overflow-hidden border"
								style={{ borderRadius: RADIUS.lg }}
							>
								<StorageImage
									kind="gallery"
									fileId={item.fileId}
									variant="640"
									transition={0}
									blurhash={item.blurHash}
									style={{ aspectRatio: 1, width: "100%" }}
									accessibilityLabel={item.name}
								/>
								{item.nsfw ? (
									<Badge
										variant="destructive"
										className="absolute right-2 top-2"
									>
										{t("profile.nsfw")}
									</Badge>
								) : null}
							</View>
						</PressableScale>
					</View>
				))}
			</View>
			{query.hasNextPage ? (
				<Button
					variant="outline"
					onPress={() => query.fetchNextPage()}
					loading={query.isFetchingNextPage}
					accessibilityRole="button"
					accessibilityLabel={t("profile.loadMore")}
				>
					<Text>{t("profile.loadMore")}</Text>
				</Button>
			) : null}
		</View>
	);
}

export default function UserProfile() {
	const { profileUrl } = useLocalSearchParams<{ profileUrl: string }>();
	const queryClient = useQueryClient();
	const { data: session } = useSession();
	const { colors, glow } = useTheme();
	const { t } = useI18n();
	const reduced = useReducedMotion();
	const [pending, setPending] = useState(false);
	const [tab, setTab] = useState("about");

	const profile = useQuery(
		orpc.profile.byUrl.queryOptions({ input: { profileUrl } }),
	);

	const targetUserId = profile.data?.userId;
	const isOwn = !!session && session.user.id === targetUserId;
	const follow = useQuery({
		...orpc.follow.status.queryOptions({
			input: { targetUserId: targetUserId ?? "" },
		}),
		enabled: !!targetUserId && !!session && !isOwn,
	});

	const gallery = useInfiniteQuery({
		...orpc.gallery.list.infiniteOptions({
			input: (page: number) => ({
				userId: targetUserId ?? "",
				page,
				pageSize: 24,
			}),
			initialPageParam: 1,
			getNextPageParam: (last) =>
				last.page * last.pageSize < last.total ? last.page + 1 : undefined,
		}),
		enabled: !!targetUserId,
	});

	const scrollY = useSharedValue(0);
	const onScroll = useAnimatedScrollHandler((e) => {
		scrollY.value = e.contentOffset.y;
	});
	const bannerStyle = useAnimatedStyle(() => {
		if (reduced) return {};
		return {
			transform: [
				{
					translateY: interpolate(
						scrollY.value,
						[0, BANNER_H],
						[0, BANNER_H * 0.4],
						Extrapolation.CLAMP,
					),
				},
				{
					scale: interpolate(
						scrollY.value,
						[-120, 0],
						[1.3, 1],
						Extrapolation.CLAMP,
					),
				},
			],
		};
	});

	if (profile.isLoading) {
		return (
			<View className="bg-background flex-1">
				<Skeleton
					className="w-full rounded-none"
					style={{ height: BANNER_H }}
				/>
				<View className="-mt-12 gap-4 px-4">
					<Skeleton className="h-24 w-24 rounded-full" />
					<Skeleton className="h-9 w-1/2" />
					<Skeleton className="h-4 w-1/3" />
					<Skeleton className="h-12 w-full rounded-2xl" />
					<View className="flex-row gap-3">
						<Skeleton className="h-16 flex-1 rounded-2xl" />
						<Skeleton className="h-16 flex-1 rounded-2xl" />
						<Skeleton className="h-16 flex-1 rounded-2xl" />
					</View>
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-2/3" />
				</View>
			</View>
		);
	}

	if (profile.isError) {
		return (
			<View className="bg-background flex-1 justify-center">
				<EmptyState
					icon={UserRound}
					title={t("common.couldntLoad")}
					subtitle={humanizeError(profile.error)}
					action={{
						label: t("common.retry"),
						onPress: () => profile.refetch(),
					}}
				/>
			</View>
		);
	}

	if (!profile.data) {
		return (
			<View className="bg-background flex-1 justify-center">
				<EmptyState icon={UserRound} title={t("profile.unavailable")} />
			</View>
		);
	}

	const p = profile.data;

	// Optimistic: flip iFollow + followersCount in the cache immediately, roll
	// back on error — the tap must not wait on the network.
	async function toggleFollow() {
		if (!targetUserId || !follow.data || pending) return;
		setPending(true);
		const followKey = orpc.follow.status.queryOptions({
			input: { targetUserId },
		}).queryKey;
		const profileKey = orpc.profile.byUrl.queryOptions({
			input: { profileUrl },
		}).queryKey;
		await Promise.all([
			queryClient.cancelQueries({ queryKey: followKey }),
			queryClient.cancelQueries({ queryKey: profileKey }),
		]);
		const prevFollow = queryClient.getQueryData(followKey);
		const prevProfile = queryClient.getQueryData(profileKey);
		const wasFollowing = follow.data.iFollow;
		queryClient.setQueryData(
			followKey,
			(old) => old && { ...old, iFollow: !old.iFollow },
		);
		queryClient.setQueryData(
			profileKey,
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
				await client.follow.remove({ targetUserId });
			} else {
				await client.follow.add({ targetUserId });
			}
		} catch (e) {
			queryClient.setQueryData(followKey, prevFollow);
			queryClient.setQueryData(profileKey, prevProfile);
			Alert.alert(t("profile.couldntFollow"), humanizeError(e));
		} finally {
			queryClient.invalidateQueries({
				queryKey: orpc.follow.status.key({ input: { targetUserId } }),
			});
			queryClient.invalidateQueries({
				queryKey: orpc.profile.byUrl.key({ input: { profileUrl } }),
			});
			setPending(false);
		}
	}

	const socials: { icon: LucideIcon; label: string }[] = [];
	if (p.discordName)
		socials.push({ icon: MessageCircle, label: p.discordName });
	if (p.telegramName) socials.push({ icon: Send, label: p.telegramName });
	if (p.furaffinityName)
		socials.push({ icon: AtSign, label: p.furaffinityName });
	if (p.xName) socials.push({ icon: AtSign, label: p.xName });
	if (p.twitchName) socials.push({ icon: Twitch, label: p.twitchName });
	if (p.blueskyName) socials.push({ icon: AtSign, label: p.blueskyName });

	const galleryTotal = gallery.data?.pages[0]?.total;

	return (
		<Animated.ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{ paddingBottom: 32 }}
			onScroll={onScroll}
			scrollEventThrottle={16}
		>
			<AnimatedEntrance index={0} preset="fade">
				<View className="w-full overflow-hidden" style={{ height: BANNER_H }}>
					<Animated.View style={[StyleSheet.absoluteFill, bannerStyle]}>
						{p.bannerFileId ? (
							<StorageImage
								kind="banner"
								fileId={p.bannerFileId}
								variant="1600"
								style={StyleSheet.absoluteFill}
								accessibilityLabel={t("profile.banner", {
									name: p.displayName ?? p.profileUrl,
								})}
							/>
						) : (
							<Gradient style={StyleSheet.absoluteFill} />
						)}
					</Animated.View>
					<Gradient
						colors={[
							withAlpha(colors.background, 0),
							withAlpha(colors.background, 0.9),
						]}
						start={{ x: 0, y: 0 }}
						end={{ x: 0, y: 1 }}
						pointerEvents="none"
						style={{
							position: "absolute",
							left: 0,
							right: 0,
							bottom: 0,
							height: 64,
						}}
					/>
				</View>
			</AnimatedEntrance>

			<View className="-mt-12 gap-4 px-4">
				<AnimatedEntrance index={1} preset="fadeUp">
					<View className="self-start rounded-full" style={GlowShadow(glow)}>
						<Gradient borderRadius={RADIUS.pill} style={{ padding: 3 }}>
							<View
								className="bg-background rounded-full"
								style={{ padding: 3 }}
							>
								<Avatar
									fileId={p.avatarFileId}
									name={p.displayName ?? p.name}
									kind="avatar"
									size={96}
								/>
							</View>
						</Gradient>
					</View>
				</AnimatedEntrance>

				<AnimatedEntrance index={2}>
					<View className="gap-1">
						<View className="flex-row flex-wrap items-center gap-2">
							<View className="shrink">
								<GradientText className="text-4xl font-extrabold leading-[44px] tracking-tight">
									{p.displayName ?? p.profileUrl}
								</GradientText>
							</View>
							{p.pronouns ? (
								<Badge variant="outline">{p.pronouns}</Badge>
							) : null}
						</View>
						<Text variant="muted">@{p.profileUrl}</Text>
						{p.status ? (
							<Text
								variant="small"
								className="text-primary italic"
								numberOfLines={1}
							>
								{p.status}
							</Text>
						) : null}
					</View>
				</AnimatedEntrance>

				<AnimatedEntrance index={3}>
					{isOwn ? (
						<Button
							variant="outline"
							onPress={() => router.push("/profile-edit")}
							accessibilityRole="button"
							accessibilityLabel={t("profile.editProfile")}
						>
							<Icon as={UserPen} size={16} className="text-foreground" />
							<Text>{t("profile.editProfile")}</Text>
						</Button>
					) : follow.data ? (
						<View className="flex-row items-center gap-3">
							<View className="flex-1">
								<Button
									variant={follow.data.iFollow ? "outline" : "default"}
									onPress={toggleFollow}
									accessibilityRole="button"
									accessibilityLabel={
										follow.data.iFollow
											? t("profile.unfollow")
											: t("profile.follow")
									}
								>
									<Text>
										{follow.data.iFollow
											? t("profile.followingAction")
											: t("profile.follow")}
									</Text>
								</Button>
							</View>
							{follow.data.followsMe ? (
								<Badge variant="secondary">{t("profile.followsYou")}</Badge>
							) : null}
						</View>
					) : !session ? (
						<Button
							variant="outline"
							onPress={() => router.push("/(auth)/login")}
							accessibilityRole="button"
							accessibilityLabel={t("profile.signInToFollow")}
						>
							<Text>{t("profile.signInToFollow")}</Text>
						</Button>
					) : null}
				</AnimatedEntrance>

				<AnimatedEntrance index={4}>
					<View className="flex-row gap-3">
						<View className="flex-1">
							<StatPill
								label={t("profile.followers")}
								value={p.followersCount}
								onPress={() => router.push(`/user/${p.profileUrl}/followers`)}
							/>
						</View>
						<View className="flex-1">
							<StatPill
								label={t("profile.following")}
								value={p.followingCount}
								onPress={() => router.push(`/user/${p.profileUrl}/following`)}
							/>
						</View>
						<View className="flex-1">
							<StatPill
								label={t("profile.gallery")}
								value={galleryTotal ?? "—"}
							/>
						</View>
					</View>
				</AnimatedEntrance>

				<AnimatedEntrance index={5} className="gap-4">
					<SegmentedTabs
						tabs={[
							{ key: "about", label: t("profile.about") },
							{ key: "gallery", label: t("profile.gallery") },
						]}
						value={tab}
						onChange={setTab}
					/>

					<AnimatedEntrance key={tab} preset="fade" className="gap-4">
						{tab === "about" ? (
							<>
								{p.bio ? (
									<Text className="text-foreground leading-6">{p.bio}</Text>
								) : null}

								{p.location ? (
									<View className="flex-row items-center gap-2">
										<Icon
											as={MapPin}
											size={16}
											className="text-muted-foreground"
										/>
										<Text variant="small" className="text-muted-foreground">
											{p.location}
										</Text>
									</View>
								) : null}

								{socials.length > 0 ? (
									<View className="gap-2">
										<Text variant="caption">{t("profile.socials")}</Text>
										{socials.map((s) => (
											<SocialRow key={s.label} icon={s.icon} label={s.label} />
										))}
									</View>
								) : null}

								{p.badges.length > 0 ? (
									<View className="flex-row flex-wrap gap-2">
										{p.badges.map((b) => (
											<Badge key={b} variant="secondary">
												{b}
											</Badge>
										))}
									</View>
								) : null}

								{!p.bio &&
								!p.location &&
								socials.length === 0 &&
								p.badges.length === 0 ? (
									<Text variant="muted">{t("profile.nothingShared")}</Text>
								) : null}
							</>
						) : (
							<GalleryGrid query={gallery} />
						)}
					</AnimatedEntrance>
				</AnimatedEntrance>
			</View>
		</Animated.ScrollView>
	);
}
