import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { orpc } from "@/lib/orpc";

export default function Announcement() {
	const { announcementId } = useLocalSearchParams<{ announcementId: string }>();
	const { data, isLoading } = useQuery(
		orpc.announcement.byId.queryOptions({ input: { announcementId } }),
	);

	if (isLoading) {
		return (
			<View className="bg-background flex-1 gap-3 p-4">
				<Skeleton className="h-8 w-2/3" />
				<Skeleton className="h-40 w-full" />
			</View>
		);
	}

	if (!data) {
		return (
			<View className="bg-background flex-1 p-4">
				<Text variant="muted">This announcement is no longer available.</Text>
			</View>
		);
	}

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{ padding: 16, gap: 12 }}
		>
			<Text variant="h2" className="border-0">
				{data.title}
			</Text>
			{data.sideText ? <Text variant="muted">{data.sideText}</Text> : null}
			<Text className="text-foreground leading-6">{data.description}</Text>
		</ScrollView>
	);
}
