import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import {
	DiscoverCommunities,
	FreshGallery,
	SayHi,
} from "@/components/home/discover";
import { HomeHero } from "@/components/home/hero";
import { HomeTiles } from "@/components/home/tiles";
import { UpNext } from "@/components/home/up-next";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { useTheme } from "@/lib/theme/provider";
import { useStorageUrls } from "@/lib/use-storage-urls";

// Same sections and data as the website's home page, stacked for a phone.
export default function Home() {
	const { data: session } = useSession();
	const { colors } = useTheme();
	const [refreshing, setRefreshing] = useState(false);
	// A fresh shuffle per visit; the API orders by md5(seed || id), so it stays
	// stable while this screen lives.
	const [seed] = useState(() => Math.random().toString(36).slice(2, 12));

	const events = useQuery(
		orpc.event.upcoming.queryOptions({ input: { limit: 3 } }),
	);
	const communities = useQuery(
		orpc.community.list.queryOptions({ input: { pageSize: 6, seed } }),
	);
	const people = useQuery(
		orpc.profile.list.queryOptions({ input: { pageSize: 4, seed } }),
	);
	const gallery = useQuery(
		orpc.gallery.list.queryOptions({ input: { page: 1, pageSize: 10 } }),
	);

	const fresh = useMemo(
		() =>
			// Like the website, the home page never shows NSFW posts.
			(gallery.data?.items ?? []).filter((g) => !g.nsfw).slice(0, 6),
		[gallery.data],
	);
	// One presign request for all thumbnails instead of one per image.
	useStorageUrls(
		"gallery",
		fresh.map((g) => g.fileId),
		"640",
	);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await Promise.allSettled([
			events.refetch(),
			communities.refetch(),
			people.refetch(),
			gallery.refetch(),
		]);
		setRefreshing(false);
	}, [events.refetch, communities.refetch, people.refetch, gallery.refetch]);

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{ padding: 12, paddingTop: 8, gap: 16 }}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={onRefresh}
					tintColor={colors.primary}
					colors={[colors.primary]}
				/>
			}
		>
			<HomeHero name={session ? (session.user?.name ?? "") : null} />
			{events.isLoading ? (
				<Skeleton className="h-40 w-full rounded-3xl" />
			) : (
				<UpNext events={(events.data ?? []).slice(0, 2)} />
			)}
			<HomeTiles />
			<DiscoverCommunities communities={communities.data?.items ?? []} />
			<SayHi people={people.data?.items ?? []} />
			<FreshGallery items={fresh} />
			<View className="items-center pb-2">
				<Text className="text-muted-foreground text-xs font-bold">
					BETA {Constants.expoConfig?.version}
				</Text>
			</View>
		</ScrollView>
	);
}
