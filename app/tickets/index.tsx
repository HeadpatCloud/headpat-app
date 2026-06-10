import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { router } from "expo-router";
import { Inbox, Plus } from "@/components/icons";
import { Pressable, RefreshControl, View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

export default function Tickets() {
	const query = useQuery(orpc.ticket.myList.queryOptions({ input: {} }));

	if (query.isLoading) {
		return (
			<View className="bg-background flex-1 gap-3 p-4">
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

	return (
		<View className="bg-background flex-1">
			<FlashList
				data={query.data ?? []}
				keyExtractor={(t) => t.id}
				contentContainerStyle={{ padding: 16 }}
				ItemSeparatorComponent={() => <View className="h-3" />}
				renderItem={({ item }) => (
					<Pressable
						onPress={() => router.push(`/tickets/${item.id}`)}
						accessibilityRole="button"
						accessibilityLabel={item.subject}
					>
						<Card className="gap-2 p-4">
							<View className="flex-row items-start justify-between gap-2">
								<Text variant="large" className="flex-1">
									{item.subject}
								</Text>
								<Badge
									variant={item.status === "open" ? "default" : "secondary"}
								>
									{item.status === "open" ? "Open" : "Closed"}
								</Badge>
							</View>
							<Text
								variant="small"
								className="text-muted-foreground capitalize"
							>
								{item.category} ·{" "}
								{formatDistanceToNow(new Date(item.lastMessageAt), {
									addSuffix: true,
								})}
							</Text>
						</Card>
					</Pressable>
				)}
				refreshControl={
					<RefreshControl
						refreshing={query.isRefetching}
						onRefresh={() => query.refetch()}
					/>
				}
				ListEmptyComponent={
					<EmptyState
						icon={Inbox}
						title="No tickets yet"
						subtitle="Open a ticket and our team will get back to you."
					/>
				}
			/>
			<PressableScale
				onPress={() => router.push("/tickets/new")}
				haptic="selection"
				accessibilityRole="button"
				accessibilityLabel="New ticket"
				className="absolute bottom-6 right-6"
			>
				<View
					className="bg-primary h-14 w-14 items-center justify-center rounded-full"
					style={{ boxShadow: "0 4 12 rgba(0, 0, 0, 0.25)" }}
				>
					<Icon as={Plus} size={26} className="text-primary-foreground" />
				</View>
			</PressableScale>
		</View>
	);
}
