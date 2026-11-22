import { FlashList } from "@shopify/flash-list";
import { eq, useLiveQuery } from "@tanstack/react-db";
import {
	useInfiniteQuery,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
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
	Cake,
	Images,
	type LucideIcon,
	MapPin,
	MessageCircle,
	Send,
	Twitch,
	UserPen,
	UserRound,
} from "@/components/icons";
import { NsfwToggle } from "@/components/nsfw-toggle";
import { RichBio } from "@/components/rich-bio";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { StorageImage } from "@/components/storage-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { formatBirthday } from "@/lib/birthday";
import {
	cacheGalleryPosts,
	cacheProfile,
	galleryPostCollection,
	profileCollection,
} from "@/lib/db/collections";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { withAlpha } from "@/lib/theme/color";
import { RADIUS } from "@/lib/theme/foundations";
import { useTheme } from "@/lib/theme/provider";
import { useShowNsfw } from "@/lib/use-show-nsfw";
import { useStorageUrls } from "@/lib/use-storage-urls";

const BANNER_H = 176;

// Reanimated needs the animated variant to drive the parallax scroll handler.
const AnimatedFlashList = Animated.createAnimatedComponent(
	FlashList<GalleryItem>,
);

// The website's social pill: tinted, icon and handle.
function SocialChip({ icon, label }: { icon: LucideIcon; label: string }) {
	return (
		<View className="bg-primary/15 flex-row items-center gap-1.5 rounded-full px-3.5 py-1.5">
			<Icon as={icon} size={14} className="text-link" />
			<Text className="text-link text-sm font-semibold">{label}</Text>
		</View>
	);
}

// The website's dark detail pill (pronouns, location, birthday).
function InfoChip({ icon, label }: { icon?: LucideIcon; label: string }) {
	return (
		<View className="bg-secondary flex-row items-center gap-1.5 rounded-full px-3 py-1">
			{icon ? (
				<Icon as={icon} size={13} className="text-secondary-foreground" />
			) : null}
			<Text className="text-secondary-foreground text-xs font-bold">
				{label}
			</Text>
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

function GalleryStatus({
	isLoading,
	isError,
	error,
	isEmpty,
	onRetry,
}: {
	isLoading: boolean;
	isError: boolean;
	error: unknown;
	isEmpty: boolean;
	onRetry: () => void;
}) {
	const { t } = useI18n();

	if (isLoading) {
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
	if (isError) {
		return (
			<EmptyState
				icon={Images}
				title={t("common.couldntLoad")}
				subtitle={humanizeError(error)}
				action={{ label: t("common.retry"), onPress: onRetry }}
			/>
		);
	}
	if (isEmpty) return <EmptyState icon={Images} title={t("profile.noPosts")} />;
	return null;
}

export default function UserProfile() {
	const { profileUrl } = useLocalSearchParams<{ profileUrl: string }>();
	const queryClient = useQueryClient();
	const { data: session } = useSession();
	const { colors } = useTheme();
	const { t } = useI18n();
	const reduced = useReducedMotion();
	const { nsfwAllowed, showNsfw, setShowNsfw } = useShowNsfw();
	const [pending, setPending] = useState(false);
	const [tab, setTab] = useState("about");

	const profile = useQuery(
		orpc.profile.byUrl.queryOptions({ input: { profileUrl } }),
	);

	// Mirror this profile into SQLite on every successful fetch — the write path
	// is the only thing that fills the offline store.
	useEffect(() => {
		if (profile.data) cacheProfile(profile.data);
	}, [profile.data]);

	const cachedProfiles = useLiveQuery(
		(q) =>
			q
				.from({ p: profileCollection })
				.where(({ p }) => eq(p.profileUrl, profileUrl)),
		[profileUrl],
	);

	const targetUserId = profile.data?.userId ?? cachedProfiles.data?.[0]?.userId;
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

	// Only per-user pages feed the mirror. The global feed has its own synced
	// collection, and writing its rows here would give one post two homes.
	useEffect(() => {
		const rows = gallery.data?.pages.flatMap((page) => page.items);
		if (rows?.length) cacheGalleryPosts(rows);
	}, [gallery.data]);

	const cachedPosts = useLiveQuery(
		(q) =>
			q
				.from({ g: galleryPostCollection })
				.where(({ g }) => eq(g.userId, targetUserId ?? ""))
				.orderBy(({ g }) => g.createdAt, "desc"),
		[targetUserId],
	).data;

	const fetchedPosts = gallery.data?.pages.flatMap((page) => page.items);
	// Only the gallery tab feeds the list; the about tab renders header-only.
	const gridItems = (
		tab === "gallery" ? (fetchedPosts ?? cachedPosts) : []
	).filter((item) => showNsfw || !item.nsfw);

	useStorageUrls(
		"gallery",
		gridItems.map((item) => item.fileId),
		"640",
	);

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

	// Offline fallback comes from the SQLite mirror, keyed by profileUrl. Branching
	// on data presence rather than connectivity: onlineManager tracks isConnected,
	// not reachability, so it flaps on captive portals and cell handoff.
	const cachedProfile = cachedProfiles.data?.[0];
	const row = profile.data ?? cachedProfile;

	if (profile.isLoading && !row) {
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

	if (profile.isError && !row) {
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

	if (!row) {
		return (
			<View className="bg-background flex-1 justify-center">
				<EmptyState icon={UserRound} title={t("profile.unavailable")} />
			</View>
		);
	}

	const p = row;

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

	const socials: { platform: string; icon: LucideIcon; label: string }[] = [];
	if (p.discordName)
		socials.push({
			platform: "discord",
			icon: MessageCircle,
			label: p.discordName,
		});
	if (p.telegramName)
		socials.push({ platform: "telegram", icon: Send, label: p.telegramName });
	if (p.furaffinityName)
		socials.push({
			platform: "furaffinity",
			icon: AtSign,
			label: p.furaffinityName,
		});
	if (p.xName) socials.push({ platform: "x", icon: AtSign, label: p.xName });
	if (p.twitchName)
		socials.push({ platform: "twitch", icon: Twitch, label: p.twitchName });
	if (p.blueskyName)
		socials.push({ platform: "bluesky", icon: AtSign, label: p.blueskyName });

	const galleryTotal = gallery.data?.pages[0]?.total;

	return (
		// The grid used to be items.map() inside a ScrollView, so every "load more"
		// mounted another 24 cells and never unmounted any. Inverting it — list owns
		// the screen, everything above becomes the header — is what makes the cells
		// recycle. The 10px inset is cancelled on the header so the banner stays
		// full-bleed, and reproduces the old -mx-1.5/p-1.5 gutter on the grid.
		<AnimatedFlashList
			className="bg-background flex-1"
			data={gridItems}
			numColumns={2}
			keyExtractor={(item: GalleryItem) => item.id}
			contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 32 }}
			onScroll={onScroll}
			scrollEventThrottle={16}
			renderItem={({ item }: { item: GalleryItem }) => (
				<View className="p-1.5">
					<PressableScale
						onPress={() => router.push(`/post/${item.id}`)}
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
								<Badge variant="destructive" className="absolute right-2 top-2">
									{t("profile.nsfw")}
								</Badge>
							) : null}
						</View>
					</PressableScale>
				</View>
			)}
			ListHeaderComponent={
				<View style={{ marginHorizontal: -10 }}>
					<AnimatedEntrance index={0} preset="fade">
						<View
							className="w-full overflow-hidden"
							style={{ height: BANNER_H }}
						>
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
							<View className="border-background bg-background self-start overflow-hidden rounded-3xl border-4">
								{p.avatarFileId ? (
									<StorageImage
										kind="avatar"
										fileId={p.avatarFileId}
										variant="md"
										style={{ width: 104, height: 104 }}
										accessibilityLabel={p.displayName ?? p.profileUrl}
									/>
								) : (
									<View
										className="bg-muted items-center justify-center"
										style={{ width: 104, height: 104 }}
									>
										<Text className="font-display text-muted-foreground text-4xl font-semibold">
											{(p.displayName ?? p.profileUrl)
												.slice(0, 1)
												.toUpperCase()}
										</Text>
									</View>
								)}
							</View>
						</AnimatedEntrance>

						<AnimatedEntrance index={2}>
							<View className="gap-1">
								<View className="flex-row flex-wrap items-center gap-2">
									<Text
										role="heading"
										className="font-display shrink text-[34px] font-semibold leading-10"
									>
										{p.displayName ?? p.profileUrl}
									</Text>
								</View>
								<Text className="text-muted-foreground font-semibold">
									@{p.profileUrl}
								</Text>
								{p.status ? (
									<Text
										className="text-muted-foreground text-lg font-semibold"
										numberOfLines={1}
									>
										{p.status}
									</Text>
								) : null}
								{p.pronouns || p.location || p.birthday ? (
									<View className="flex-row flex-wrap gap-1.5 pt-2">
										{p.pronouns ? <InfoChip label={p.pronouns} /> : null}
										{p.location ? (
											<InfoChip icon={MapPin} label={p.location} />
										) : null}
										{p.birthday ? (
											<InfoChip
												icon={Cake}
												label={formatBirthday(p.birthday, {
													showDay: p.birthdayShowDay !== false,
													showYear: p.birthdayShowYear !== false,
												})}
											/>
										) : null}
									</View>
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
							<View className="border-border flex-row gap-5 border-y py-3">
								<Pressable
									onPress={() => router.push(`/user/${p.profileUrl}/followers`)}
									accessibilityRole="link"
									hitSlop={8}
								>
									<Text className="text-muted-foreground">
										<Text className="text-foreground font-extrabold">
											{p.followersCount}
										</Text>{" "}
										{t("profile.followers").toLowerCase()}
									</Text>
								</Pressable>
								<Pressable
									onPress={() => router.push(`/user/${p.profileUrl}/following`)}
									accessibilityRole="link"
									hitSlop={8}
								>
									<Text className="text-muted-foreground">
										<Text className="text-foreground font-extrabold">
											{p.followingCount}
										</Text>{" "}
										{t("profile.following").toLowerCase()}
									</Text>
								</Pressable>
								{galleryTotal !== undefined ? (
									<Text className="text-muted-foreground">
										<Text className="text-foreground font-extrabold">
											{galleryTotal}
										</Text>{" "}
										{t("profile.gallery").toLowerCase()}
									</Text>
								) : null}
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
										{p.bioHtml ? (
											<RichBio html={p.bioHtml} />
										) : p.bio ? (
											<Text className="text-foreground leading-6">{p.bio}</Text>
										) : null}

										{socials.length > 0 ? (
											<View className="flex-row flex-wrap gap-2">
												{socials.map((s) => (
													<SocialChip
														key={s.platform}
														icon={s.icon}
														label={s.label}
													/>
												))}
											</View>
										) : null}

										{p.badges.length > 0 ? (
											<View className="flex-row flex-wrap gap-2">
												{p.badges.map((b) => (
													<Badge key={b} variant="tonal">
														{b}
													</Badge>
												))}
											</View>
										) : null}

										{!p.bio &&
										!p.bioHtml &&
										!p.location &&
										socials.length === 0 &&
										p.badges.length === 0 ? (
											<Text variant="muted">{t("profile.nothingShared")}</Text>
										) : null}
									</>
								) : (
									<>
										{nsfwAllowed ? (
											<NsfwToggle
												value={showNsfw}
												onValueChange={setShowNsfw}
											/>
										) : null}
										<GalleryStatus
											isLoading={gallery.isLoading && !cachedPosts.length}
											isError={gallery.isError && !cachedPosts.length}
											error={gallery.error}
											isEmpty={gridItems.length === 0 && !gallery.hasNextPage}
											onRetry={() => gallery.refetch()}
										/>
									</>
								)}
							</AnimatedEntrance>
						</AnimatedEntrance>
					</View>
				</View>
			}
			ListFooterComponent={
				tab === "gallery" && gallery.hasNextPage ? (
					<View style={{ marginHorizontal: -10 }} className="px-4 pt-4">
						<Button
							variant="outline"
							onPress={() => gallery.fetchNextPage()}
							loading={gallery.isFetchingNextPage}
							accessibilityRole="button"
							accessibilityLabel={t("profile.loadMore")}
						>
							<Text>{t("profile.loadMore")}</Text>
						</Button>
					</View>
				) : null
			}
		/>
	);
}
