import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Plus, Search, Users } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { PaginatedList } from "@/components/paginated-list";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

export default function Communities() {
	const { data: session } = useSession();
	const [text, setText] = useState("");
	const [search, setSearch] = useState("");

	const query = useInfiniteQuery(
		orpc.community.list.infiniteOptions({
			input: (page: number) => ({
				page,
				pageSize: 24,
				...(search ? { search } : {}),
			}),
			initialPageParam: 1,
			getNextPageParam: (last) =>
				last.page * last.pageSize < last.total ? last.page + 1 : undefined,
		}),
	);

	return (
		<View className="bg-background flex-1">
			<PaginatedList
				query={query}
				keyExtractor={(c) => c.id}
				emptyTitle={search ? "No communities found" : "No communities yet"}
				emptySubtitle={search ? "Try a different search." : undefined}
				ListHeaderComponent={
					<View className="flex-row items-center gap-2 pb-3">
						<View className="flex-1 flex-row items-center">
							<Input
								value={text}
								onChangeText={setText}
								onSubmitEditing={() => setSearch(text.trim())}
								returnKeyType="search"
								placeholder="Search communities"
								className="flex-1"
								accessibilityLabel="Search communities"
							/>
						</View>
						<Pressable
							onPress={() => setSearch(text.trim())}
							accessibilityRole="button"
							accessibilityLabel="Search"
							className="bg-primary h-11 w-11 items-center justify-center rounded-md"
						>
							<Icon as={Search} size={20} className="text-primary-foreground" />
						</Pressable>
					</View>
				}
				renderItem={(c) => (
					<Pressable
						onPress={() => router.push(`/community/${c.id}`)}
						accessibilityRole="button"
						accessibilityLabel={c.name}
					>
						<Card className="flex-row gap-3 p-4">
							<Avatar
								fileId={c.avatarFileId}
								name={c.name}
								kind="community-avatar"
								size={52}
							/>
							<View className="flex-1 gap-1">
								<Text variant="large" numberOfLines={1}>
									{c.name}
								</Text>
								{c.description ? (
									<Text variant="muted" numberOfLines={2}>
										{c.description}
									</Text>
								) : null}
								<View className="flex-row items-center gap-1.5 pt-0.5">
									<Icon
										as={Users}
										size={14}
										className="text-muted-foreground"
									/>
									<Text variant="small" className="text-muted-foreground">
										{c.followersCount}
									</Text>
								</View>
								{c.tags.length > 0 ? (
									<View className="flex-row flex-wrap gap-1.5 pt-1">
										{c.tags.slice(0, 3).map((tag) => (
											<Badge key={tag} variant="secondary">
												{tag}
											</Badge>
										))}
									</View>
								) : null}
							</View>
						</Card>
					</Pressable>
				)}
			/>
			{session ? (
				<Pressable
					onPress={() => router.push("/community/new")}
					accessibilityRole="button"
					accessibilityLabel="New community"
					className="bg-primary absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full shadow-lg"
				>
					<Icon as={Plus} size={26} className="text-primary-foreground" />
				</Pressable>
			) : null}
		</View>
	);
}
