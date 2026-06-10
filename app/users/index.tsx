import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { PaginatedList } from "@/components/paginated-list";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { orpc } from "@/lib/orpc";

export default function Users() {
	const [text, setText] = useState("");
	const [search, setSearch] = useState("");
	const query = useInfiniteQuery({
		...orpc.profile.list.infiniteOptions({
			input: (page: number) => ({
				page,
				pageSize: 24,
				...(search ? { search } : {}),
			}),
			initialPageParam: 1,
			getNextPageParam: (last) =>
				last.page * last.pageSize < last.total ? last.page + 1 : undefined,
		}),
		// Keep the old results (and the search input mounted) while a new
		// search term loads, instead of flashing the skeleton screen.
		placeholderData: keepPreviousData,
	});

	return (
		<PaginatedList
			query={query}
			keyExtractor={(u) => u.userId}
			emptyTitle="No profiles found"
			emptySubtitle={search ? "Try a different search." : undefined}
			ListHeaderComponent={
				<View className="pb-3">
					<Input
						value={text}
						onChangeText={setText}
						onSubmitEditing={() => setSearch(text.trim())}
						placeholder="Search profiles"
						autoCapitalize="none"
						autoCorrect={false}
						returnKeyType="search"
						accessibilityLabel="Search profiles"
					/>
				</View>
			}
			renderItem={(u) => (
				<PressableScale
					onPress={() => router.push(`/user/${u.profileUrl}`)}
					haptic="selection"
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
				</PressableScale>
			)}
		/>
	);
}
