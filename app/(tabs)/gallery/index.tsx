import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import { Inbox, Plus } from "@/components/icons";
import { StorageImage } from "@/components/storage-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/ui/fab";
import { GlowShadow } from "@/components/ui/gradient";
import { GradientText } from "@/components/ui/gradient-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { type client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { useTheme } from "@/lib/theme/provider";

type GalleryItem = Awaited<
	ReturnType<typeof client.gallery.list>
>["items"][number];

function GalleryHeader() {
	const { t } = useI18n();
	return (
		<AnimatedEntrance index={0} className="px-1.5 pb-3 pt-1">
			<GradientText
				heading
				className="text-[34px] font-extrabold leading-10 tracking-tight"
			>
				{t("gallery.title")}
			</GradientText>
			<Text variant="muted" className="mt-0.5">
				{t("gallery.subtitle")}
			</Text>
		</AnimatedEntrance>
	);
}

function GalleryCard({
	item,
	index,
	seen,
}: {
	item: GalleryItem;
	index: number;
	seen: boolean;
}) {
	const { glow } = useTheme();
	const { t } = useI18n();
	const [pressed, setPressed] = useState(false);
	return (
		<AnimatedEntrance index={index} disabled={seen}>
			<PressableScale
				className="p-1.5"
				onPress={() => router.push(`/gallery/${item.id}`)}
				onPressIn={() => setPressed(true)}
				onPressOut={() => setPressed(false)}
				android_ripple={{
					color: "rgba(255,255,255,0.15)",
					foreground: true,
				}}
				accessibilityRole="button"
				accessibilityLabel={item.name}
			>
				<View
					className="bg-card border-border overflow-hidden rounded-2xl border"
					style={pressed ? GlowShadow(glow) : undefined}
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
							{t("gallery.nsfw")}
						</Badge>
					) : null}
				</View>
			</PressableScale>
		</AnimatedEntrance>
	);
}

export default function Gallery() {
	const { data: session } = useSession();
	const { colors } = useTheme();
	const { t } = useI18n();
	const animated = useRef(new Set<number>());
	const query = useInfiniteQuery(
		orpc.gallery.list.infiniteOptions({
			input: (page: number) => ({ page, pageSize: 24 }),
			initialPageParam: 1,
			getNextPageParam: (last) =>
				last.page * last.pageSize < last.total ? last.page + 1 : undefined,
		}),
	);

	if (query.isLoading) {
		return (
			<View className="bg-background flex-1" style={{ padding: 12 }}>
				<GalleryHeader />
				<View className="flex-row flex-wrap">
					{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
						<View key={i} style={{ width: "50%", padding: 6 }}>
							<Skeleton className="aspect-square w-full rounded-2xl" />
						</View>
					))}
				</View>
			</View>
		);
	}

	if (query.isError) {
		return (
			<View className="bg-background flex-1 items-center justify-center">
				<EmptyState
					icon={Inbox}
					title={t("common.couldntLoad")}
					subtitle={humanizeError(query.error)}
				/>
				<Button
					variant="outline"
					onPress={() => query.refetch()}
					accessibilityRole="button"
					accessibilityLabel={t("gallery.tryAgain")}
				>
					<Text>{t("gallery.tryAgain")}</Text>
				</Button>
			</View>
		);
	}

	const items = query.data?.pages.flatMap((p) => p.items) ?? [];

	return (
		<View className="bg-background flex-1">
			<FlashList
				data={items}
				numColumns={2}
				keyExtractor={(item) => item.id}
				contentContainerStyle={{ padding: 12 }}
				ListHeaderComponent={<GalleryHeader />}
				renderItem={({ item, index }) => {
					const seen = animated.current.has(index);
					if (!seen) animated.current.add(index);
					return <GalleryCard item={item} index={index} seen={seen} />;
				}}
				onEndReachedThreshold={0.5}
				onEndReached={() => {
					if (query.hasNextPage && !query.isFetchingNextPage)
						query.fetchNextPage();
				}}
				refreshControl={
					<RefreshControl
						refreshing={query.isRefetching && !query.isFetchingNextPage}
						onRefresh={() => query.refetch()}
						tintColor={colors.primary}
						colors={[colors.primary]}
					/>
				}
				ListEmptyComponent={
					<EmptyState
						icon={Inbox}
						title={t("gallery.empty")}
						action={{
							label: t("gallery.shareFirst"),
							onPress: () =>
								session
									? router.push("/gallery/upload")
									: router.push("/(auth)/login"),
						}}
					/>
				}
				ListFooterComponent={
					query.isFetchingNextPage ? (
						<ActivityIndicator className="py-4" color={colors.primary} />
					) : null
				}
			/>
			{session ? (
				<Fab
					icon={Plus}
					onPress={() => router.push("/gallery/upload")}
					accessibilityLabel={t("gallery.newPost")}
				/>
			) : null}
		</View>
	);
}
