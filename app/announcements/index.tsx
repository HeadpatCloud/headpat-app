import { useInfiniteQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { router } from "expo-router";
import { Pressable } from "react-native";
import { PaginatedList } from "@/components/paginated-list";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { orpc } from "@/lib/orpc";

export default function Announcements() {
	const query = useInfiniteQuery(
		orpc.announcement.list.infiniteOptions({
			input: (page: number) => ({ page, pageSize: 24 }),
			initialPageParam: 1,
			getNextPageParam: (last) =>
				last.page * last.pageSize < last.total ? last.page + 1 : undefined,
		}),
	);

	return (
		<PaginatedList
			query={query}
			keyExtractor={(a) => a.id}
			emptyTitle="No announcements yet"
			renderItem={(a) => (
				<Pressable
					onPress={() => router.push(`/announcements/${a.id}`)}
					accessibilityRole="button"
					accessibilityLabel={a.title ?? undefined}
				>
					<Card className="gap-1.5 p-4">
						<Text variant="large">{a.title}</Text>
						{a.sideText ? <Text variant="muted">{a.sideText}</Text> : null}
						<Text variant="small" className="text-muted-foreground">
							{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
						</Text>
					</Card>
				</Pressable>
			)}
		/>
	);
}
