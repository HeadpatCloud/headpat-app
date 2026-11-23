import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { router } from "expo-router";
import {
	Fragment,
	type ReactNode,
	useCallback,
	useMemo,
	useState,
} from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import {
	DiscoverCommunities,
	FreshGallery,
	SayHi,
} from "@/components/home/discover";
import { HomeHero } from "@/components/home/hero";
import { HomeTiles } from "@/components/home/tiles";
import { UpNext } from "@/components/home/up-next";
import { SlidersHorizontal } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { orpc } from "@/lib/orpc";
import { useTheme } from "@/lib/theme/provider";
import { useStorageUrls } from "@/lib/use-storage-urls";
import type { HomeSectionId } from "@/widgets/settings";
import { useWidgetSettings } from "@/widgets/use-widgets";

// Same sections and data as the website's home page, stacked for a phone, in
// the order the user picked (Customize home). Hidden sections aren't fetched.
export default function Home() {
	const { data: session } = useSession();
	const { colors } = useTheme();
	const { t } = useI18n();
	const { settings } = useWidgetSettings();
	const sections = settings.home.sections;
	const shown = useMemo(
		() => new Set(sections.filter((s) => !s.hidden).map((s) => s.id)),
		[sections],
	);
	const [refreshing, setRefreshing] = useState(false);
	// A fresh shuffle per visit; the API orders by md5(seed || id), so it stays
	// stable while this screen lives.
	const [seed] = useState(() => Math.random().toString(36).slice(2, 12));

	const events = useQuery({
		...orpc.event.upcoming.queryOptions({ input: { limit: 3 } }),
		enabled: shown.has("upNext"),
	});
	const communities = useQuery({
		...orpc.community.list.queryOptions({ input: { pageSize: 6, seed } }),
		enabled: shown.has("communities"),
	});
	const people = useQuery({
		...orpc.profile.list.queryOptions({ input: { pageSize: 4, seed } }),
		enabled: shown.has("people"),
	});
	const gallery = useQuery({
		...orpc.gallery.list.queryOptions({ input: { page: 1, pageSize: 10 } }),
		enabled: shown.has("gallery"),
	});

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
			shown.has("upNext") && events.refetch(),
			shown.has("communities") && communities.refetch(),
			shown.has("people") && people.refetch(),
			shown.has("gallery") && gallery.refetch(),
		]);
		setRefreshing(false);
	}, [
		shown,
		events.refetch,
		communities.refetch,
		people.refetch,
		gallery.refetch,
	]);

	const render: Record<HomeSectionId, () => ReactNode> = {
		hero: () => <HomeHero name={session ? (session.user?.name ?? "") : null} />,
		upNext: () =>
			events.isLoading ? (
				<Skeleton className="h-40 w-full rounded-3xl" />
			) : (
				<UpNext events={(events.data ?? []).slice(0, 2)} />
			),
		tiles: () => <HomeTiles />,
		communities: () => (
			<DiscoverCommunities communities={communities.data?.items ?? []} />
		),
		people: () => <SayHi people={people.data?.items ?? []} />,
		gallery: () => <FreshGallery items={fresh} />,
	};

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
			{sections.map((section) =>
				section.hidden ? null : (
					<Fragment key={section.id}>{render[section.id]()}</Fragment>
				),
			)}
			<View className="items-center gap-3 pb-2">
				<Pressable
					onPress={() => router.push("/home-layout")}
					accessibilityRole="button"
					accessibilityLabel={t("widgets.home.customize")}
					hitSlop={8}
					className="bg-card active:bg-muted flex-row items-center gap-2 rounded-full px-4 py-2"
				>
					<Icon as={SlidersHorizontal} size={16} className="text-link" />
					<Text className="text-link text-sm font-extrabold">
						{t("widgets.home.customize")}
					</Text>
				</Pressable>
				<Text className="text-muted-foreground text-xs font-bold">
					BETA {Constants.expoConfig?.version}
				</Text>
			</View>
		</ScrollView>
	);
}
