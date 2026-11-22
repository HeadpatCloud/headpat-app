import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import { ConversationRow } from "@/components/chat/conversation-row";
import { EmptyState } from "@/components/empty-state";
import { MessagesSquare, Plus } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { PageTitle } from "@/components/ui/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import type { Conversation } from "@/lib/chat";
import { useI18n } from "@/lib/i18n/provider";
import { orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { useTheme } from "@/lib/theme/provider";

const renderRow = ({ item }: { item: Conversation }) => (
	<ConversationRow conversation={item} />
);
const keyOf = (c: Conversation) => c.id;
// Hairline between rows, starting under the names like the website's lists.
const Separator = () => <View className="bg-border ml-[68px] h-px" />;

function SignedOut() {
	const { t } = useI18n();
	return (
		<View className="bg-background flex-1 px-4">
			<PageTitle title={t("chat.title")} />
			<View className="flex-1 items-center justify-center">
				<EmptyState
					icon={MessagesSquare}
					title={t("chat.signInPrompt")}
					action={{
						label: t("home.logIn"),
						onPress: () => router.push("/(auth)/login"),
					}}
				/>
			</View>
		</View>
	);
}

function ConversationList() {
	const { t } = useI18n();
	const { colors } = useTheme();
	const query = useInfiniteQuery(
		orpc.message.myConversations.infiniteOptions({
			input: (page: number) => ({ page, pageSize: 30 }),
			initialPageParam: 1,
			getNextPageParam: (last) =>
				last.page * last.pageSize < last.total ? last.page + 1 : undefined,
		}),
	);
	const items = useMemo(
		() => query.data?.pages.flatMap((p) => p.items) ?? [],
		[query.data],
	);

	const header = (
		<PageTitle
			title={t("chat.title")}
			action={{
				label: t("chat.newMessage"),
				icon: Plus,
				onPress: () => router.push("/chat/new"),
			}}
		/>
	);

	if (query.isLoading) {
		return (
			<View className="bg-background flex-1 px-4">
				{header}
				<Card className="gap-2 p-2">
					{[0, 1, 2, 3, 4].map((i) => (
						<View key={i} className="flex-row items-center gap-3 p-2">
							<Skeleton className="h-12 w-12 rounded-full" />
							<View className="flex-1 gap-2">
								<Skeleton className="h-4 w-2/3 rounded-full" />
								<Skeleton className="h-3 w-1/3 rounded-full" />
							</View>
						</View>
					))}
				</Card>
			</View>
		);
	}

	return (
		<View className="bg-background flex-1">
			<FlashList
				data={items}
				keyExtractor={keyOf}
				renderItem={renderRow}
				ItemSeparatorComponent={Separator}
				contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
				ListHeaderComponent={header}
				onEndReachedThreshold={0.5}
				onEndReached={() => {
					if (query.hasNextPage && !query.isFetchingNextPage)
						query.fetchNextPage();
				}}
				refreshControl={
					<RefreshControl
						refreshing={query.isRefetching && !query.isFetchingNextPage}
						onRefresh={() => {
							void query.refetch();
						}}
						tintColor={colors.primary}
						colors={[colors.primary]}
					/>
				}
				ListEmptyComponent={
					<EmptyState
						icon={MessagesSquare}
						title={
							query.isError
								? t("common.couldntLoad")
								: t("chat.noConversations")
						}
						subtitle={query.isError ? humanizeError(query.error) : undefined}
						action={
							query.isError
								? { label: t("common.retry"), onPress: () => query.refetch() }
								: {
										label: t("chat.newMessage"),
										onPress: () => router.push("/chat/new"),
									}
						}
					/>
				}
				ListFooterComponent={
					query.isFetchingNextPage ? (
						<ActivityIndicator className="py-4" color={colors.primary} />
					) : null
				}
			/>
		</View>
	);
}

export default function ChatTab() {
	const { data: session, isPending } = useSession();
	if (!session && !isPending) return <SignedOut />;
	return <ConversationList />;
}
