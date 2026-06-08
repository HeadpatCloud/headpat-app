import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { PaginatedList } from "@/components/paginated-list";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { orpc } from "@/lib/orpc";

export default function Users() {
	const [search, setSearch] = useState("");
	const query = useInfiniteQuery(
		orpc.profile.list.infiniteOptions({
			input: (page: number) => ({
				page,
				pageSize: 24,
				...(search.trim() ? { search: search.trim() } : {}),
			}),
			initialPageParam: 1,
			getNextPageParam: (last) =>
				last.page * last.pageSize < last.total ? last.page + 1 : undefined,
		}),
	);

	return (
		<PaginatedList
			query={query}
			keyExtractor={(u) => u.userId}
			emptyTitle="No profiles found"
			emptySubtitle={search.trim() ? "Try a different search." : undefined}
			ListHeaderComponent={
				<View className="pb-3">
					<Input
						value={search}
						onChangeText={setSearch}
						placeholder="Search profiles"
						autoCapitalize="none"
						autoCorrect={false}
						returnKeyType="search"
						accessibilityLabel="Search profiles"
					/>
				</View>
			}
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
							size={48}
						/>
						<View className="flex-1 gap-0.5">
							<Text variant="large" numberOfLines={1}>
								{u.displayName ?? u.profileUrl}
							</Text>
							<Text variant="muted" numberOfLines={1}>
								@{u.profileUrl}
							</Text>
							{u.bio ? (
								<Text
									variant="small"
									className="text-muted-foreground"
									numberOfLines={1}
								>
									{u.bio}
								</Text>
							) : null}
						</View>
						<Text variant="small" className="text-muted-foreground">
							{u.followersCount} followers
						</Text>
					</Card>
				</Pressable>
			)}
		/>
	);
}
