import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Inbox } from "lucide-react-native";
import {
	ActivityIndicator,
	Pressable,
	RefreshControl,
	View,
} from "react-native";
import { EmptyState } from "@/components/empty-state";
import { StorageImage } from "@/components/storage-image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

export default function Gallery() {
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
			<View className="bg-background flex-1 flex-row flex-wrap gap-2 p-2">
				{[0, 1, 2, 3, 4, 5].map((i) => (
					<View key={i} className="p-1" style={{ width: "50%" }}>
						<Skeleton className="aspect-square w-full rounded-xl" />
					</View>
				))}
			</View>
		);
	}

	if (query.isError) {
		return (
			<EmptyState
				icon={Inbox}
				title="Couldn't load"
				subtitle={humanizeError(query.error)}
			/>
		);
	}

	const items = query.data?.pages.flatMap((p) => p.items) ?? [];

	return (
		<FlashList
			data={items}
			numColumns={2}
			keyExtractor={(item) => item.id}
			contentContainerStyle={{ padding: 8 }}
			renderItem={({ item }) => (
				<Pressable
					className="p-1"
					style={{ flex: 1 }}
					onPress={() => router.push(`/gallery/${item.id}`)}
					accessibilityRole="button"
					accessibilityLabel={item.name}
				>
					<View className="bg-card border-border overflow-hidden rounded-xl border">
						<StorageImage
							kind="gallery"
							fileId={item.fileId}
							blurhash={item.blurHash}
							style={{ aspectRatio: 1, width: "100%" }}
							accessibilityLabel={item.name}
						/>
						{item.nsfw ? (
							<Badge
								variant="destructive"
								className="absolute right-1.5 top-1.5"
							>
								NSFW
							</Badge>
						) : null}
					</View>
				</Pressable>
			)}
			onEndReachedThreshold={0.5}
			onEndReached={() => {
				if (query.hasNextPage && !query.isFetchingNextPage)
					query.fetchNextPage();
			}}
			refreshControl={
				<RefreshControl
					refreshing={query.isRefetching && !query.isFetchingNextPage}
					onRefresh={() => query.refetch()}
				/>
			}
			ListEmptyComponent={
				<EmptyState icon={Inbox} title="No gallery items yet" />
			}
			ListFooterComponent={
				query.isFetchingNextPage ? <ActivityIndicator className="py-4" /> : null
			}
		/>
	);
}
