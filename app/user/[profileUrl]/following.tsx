import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { PaginatedList } from "@/components/paginated-list";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { orpc } from "@/lib/orpc";

export default function Following() {
	const { profileUrl } = useLocalSearchParams<{ profileUrl: string }>();
	const profile = useQuery(
		orpc.profile.byUrl.queryOptions({ input: { profileUrl } }),
	);
	const userId = profile.data?.userId;

	const query = useInfiniteQuery({
		...orpc.follow.following.infiniteOptions({
			input: (page: number) => ({ userId: userId ?? "", page, pageSize: 24 }),
			initialPageParam: 1,
			getNextPageParam: (last) =>
				last.page * last.pageSize < last.total ? last.page + 1 : undefined,
		}),
		enabled: !!userId,
	});

	return (
		<PaginatedList
			query={query}
			keyExtractor={(u) => u.userId}
			emptyTitle="Not following anyone yet"
			renderItem={(u) => (
				<Pressable
					onPress={() => router.push(`/user/${u.profileUrl}`)}
					accessibilityRole="button"
					accessibilityLabel={u.displayName ?? u.profileUrl}
				>
					<Card className="flex-row items-center gap-3 p-3">
						<Avatar
							fileId={u.avatarFileId}
							name={u.displayName ?? u.name}
							kind="avatar"
							size={44}
						/>
						<View className="flex-1 gap-0.5">
							<Text variant="large" numberOfLines={1}>
								{u.displayName ?? u.profileUrl}
							</Text>
							<Text variant="muted" numberOfLines={1}>
								@{u.profileUrl}
							</Text>
						</View>
					</Card>
				</Pressable>
			)}
		/>
	);
}
