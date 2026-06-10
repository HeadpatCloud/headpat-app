import { FlashList } from "@shopify/flash-list";
import { type ReactElement, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import { Inbox } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { humanizeError } from "@/lib/orpc-error";
import { useTheme } from "@/lib/theme/provider";

type Page<T> = { items: T[] };

const Separator = () => <View className="h-3" />;

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
	emptyTitle,
	emptySubtitle,
	contentPadding = 16,
	skeleton,
	skeletonCount = 5,
	numColumns = 1,
	estimatedItemSize: _estimatedItemSize,
}: {
	query: InfiniteQuery<T>;
	renderItem: (item: T) => ReactElement;
	keyExtractor: (item: T) => string;
	ListHeaderComponent?: ReactElement;
	emptyTitle?: string;
	emptySubtitle?: string;
	contentPadding?: number;
	skeleton?: ReactElement;
	skeletonCount?: number;
	numColumns?: number;
	estimatedItemSize?: number;
}) {
	const { colors } = useTheme();
	const { t } = useI18n();
	const animated = useRef(new Set<number>());
	// Manual pull-to-refresh only — binding isRefetching here pops the spinner
	// on every background stale-while-revalidate refetch.
	const [refreshing, setRefreshing] = useState(false);

	if (query.isLoading) {
		return (
			<View className="gap-3 p-4">
				{Array.from({ length: skeletonCount }, (_, i) =>
					skeleton ? (
						<View key={`s${i}`}>{skeleton}</View>
					) : (
						<Skeleton key={`s${i}`} className="h-20 w-full rounded-xl" />
					),
				)}
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

	const items = query.data?.pages.flatMap((p) => p.items) ?? [];
	const columnGap = numColumns > 1 ? 12 : 0;

	return (
		<FlashList
			data={items}
			numColumns={numColumns}
			renderItem={({ item, index }) => {
				const seen = animated.current.has(index);
				if (!seen) animated.current.add(index);
				const cell = (
					<AnimatedEntrance index={index} disabled={seen}>
						{renderItem(item)}
					</AnimatedEntrance>
				);
				return columnGap > 0 ? (
					<View style={{ paddingHorizontal: columnGap / 2 }}>{cell}</View>
				) : (
					cell
				);
			}}
			keyExtractor={keyExtractor}
			contentContainerStyle={{ padding: contentPadding }}
			ItemSeparatorComponent={Separator}
			ListHeaderComponent={ListHeaderComponent}
			onEndReachedThreshold={0.5}
			onEndReached={() => {
				if (query.hasNextPage && !query.isFetchingNextPage)
					query.fetchNextPage();
			}}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={async () => {
						setRefreshing(true);
						try {
							await query.refetch();
						} finally {
							setRefreshing(false);
						}
					}}
					tintColor={colors.primary}
					colors={[colors.primary]}
				/>
			}
			ListEmptyComponent={
				<EmptyState
					icon={Inbox}
					title={emptyTitle ?? t("common.nothingHere")}
					subtitle={emptySubtitle}
				/>
			}
			ListFooterComponent={
				query.isFetchingNextPage ? (
					<ActivityIndicator className="py-4" color={colors.primary} />
				) : null
			}
		/>
	);
}
