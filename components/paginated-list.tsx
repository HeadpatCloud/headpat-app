import { FlashList } from "@shopify/flash-list";
import { Inbox } from "lucide-react-native";
import { useRef, type ReactElement } from "react";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { humanizeError } from "@/lib/orpc-error";

type Page<T> = { items: T[] };

type InfiniteQuery<T> = {
	data?: { pages: Page<T>[] };
	isLoading: boolean;
	isError: boolean;
	error: unknown;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	isRefetching: boolean;
	fetchNextPage: () => void;
	refetch: () => void;
};

export function PaginatedList<T>({
	query,
	renderItem,
	keyExtractor,
	ListHeaderComponent,
	emptyTitle = "Nothing here yet",
	emptySubtitle,
	contentPadding = 16,
}: {
	query: InfiniteQuery<T>;
	renderItem: (item: T) => ReactElement;
	keyExtractor: (item: T) => string;
	ListHeaderComponent?: ReactElement;
	emptyTitle?: string;
	emptySubtitle?: string;
	contentPadding?: number;
}) {
	const animated = useRef(new Set<number>());

	if (query.isLoading) {
		return (
			<View className="gap-3 p-4">
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
				title="Couldn't load"
				subtitle={humanizeError(query.error)}
			/>
		);
	}

	const items = query.data?.pages.flatMap((p) => p.items) ?? [];

	return (
		<FlashList
			data={items}
			renderItem={({ item, index }) => {
					const seen = animated.current.has(index);
					if (!seen) animated.current.add(index);
					return (
						<AnimatedEntrance index={index} disabled={seen}>
							{renderItem(item)}
						</AnimatedEntrance>
					);
				}}
			keyExtractor={keyExtractor}
			contentContainerStyle={{ padding: contentPadding }}
			ItemSeparatorComponent={() => <View className="h-3" />}
			ListHeaderComponent={ListHeaderComponent}
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
				<EmptyState icon={Inbox} title={emptyTitle} subtitle={emptySubtitle} />
			}
			ListFooterComponent={
				query.isFetchingNextPage ? <ActivityIndicator className="py-4" /> : null
			}
		/>
	);
}
