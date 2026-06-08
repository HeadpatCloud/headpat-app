import { useInfiniteQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { router } from "expo-router";
import { MapPin, Users } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { PaginatedList } from "@/components/paginated-list";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { orpc } from "@/lib/orpc";

export default function Events() {
	const query = useInfiniteQuery(
		orpc.event.list.infiniteOptions({
			input: (page: number) => ({ page, pageSize: 24 }),
			initialPageParam: 1,
			getNextPageParam: (last) =>
				last.page * last.pageSize < last.total ? last.page + 1 : undefined,
		}),
	);

	return (
		<PaginatedList
			query={query}
			keyExtractor={(e) => e.id}
			emptyTitle="No events yet"
			emptySubtitle="Upcoming events will show up here."
			renderItem={(e) => (
				<Pressable
					onPress={() => router.push(`/events/${e.id}`)}
					accessibilityRole="button"
					accessibilityLabel={e.title}
				>
					<Card className="gap-2 p-4">
						<Text variant="large" numberOfLines={2}>
							{e.title}
						</Text>
						{e.locationText ? (
							<View className="flex-row items-center gap-1.5">
								<Icon as={MapPin} size={14} className="text-muted-foreground" />
								<Text variant="muted" numberOfLines={1} className="flex-1">
									{e.locationText}
								</Text>
							</View>
						) : null}
						<View className="flex-row items-center gap-3">
							<Text variant="small" className="text-muted-foreground">
								{formatDistanceToNow(new Date(e.startsAt), { addSuffix: true })}
							</Text>
							<View className="flex-row items-center gap-1.5">
								<Icon as={Users} size={14} className="text-muted-foreground" />
								<Text variant="small" className="text-muted-foreground">
									{e.attendeesCount}
								</Text>
							</View>
						</View>
						{e.tags.length > 0 ? (
							<View className="flex-row flex-wrap gap-1.5">
								{e.tags.map((tag) => (
									<Badge key={tag} variant="secondary">
										{tag}
									</Badge>
								))}
							</View>
						) : null}
					</Card>
				</Pressable>
			)}
		/>
	);
}
