import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useLocalSearchParams } from "expo-router";
import { CalendarClock, Globe, MapPin, Users } from "lucide-react-native";
import { useState } from "react";
import { Alert, Linking, ScrollView, View } from "react-native";
import { StorageImage } from "@/components/storage-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

export default function Event() {
	const { eventId } = useLocalSearchParams<{ eventId: string }>();
	const queryClient = useQueryClient();
	const [pending, setPending] = useState(false);

	const { data, isLoading } = useQuery(
		orpc.event.byId.queryOptions({ input: { eventId } }),
	);
	const myAttending = useQuery(orpc.event.myAttending.queryOptions());

	const attending =
		myAttending.data?.some((row) => row.eventId === eventId) ?? false;

	async function toggleAttend() {
		setPending(true);
		try {
			if (attending) {
				await client.event.unattend({ eventId });
			} else {
				await client.event.attend({ eventId });
			}
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: orpc.event.myAttending.key(),
				}),
				queryClient.invalidateQueries({
					queryKey: orpc.event.byId.key({ input: { eventId } }),
				}),
			]);
		} catch (e) {
			Alert.alert("Couldn't update attendance", humanizeError(e));
		} finally {
			setPending(false);
		}
	}

	async function openWebsite(url: string) {
		try {
			await Linking.openURL(url);
		} catch (e) {
			Alert.alert("Couldn't open link", humanizeError(e));
		}
	}

	if (isLoading) {
		return (
			<View className="bg-background flex-1 gap-3 p-4">
				<Skeleton className="h-8 w-2/3" />
				<Skeleton className="h-48 w-full" />
				<Skeleton className="h-24 w-full" />
			</View>
		);
	}

	if (!data) {
		return (
			<View className="bg-background flex-1 p-4">
				<Text variant="muted">This event is no longer available.</Text>
			</View>
		);
	}

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{ padding: 16, gap: 16 }}
		>
			{data.images.length > 0 ? (
				<StorageImage
					kind="gallery"
					fileId={data.images[0]}
					style={{ width: "100%", height: 200, borderRadius: 12 }}
					accessibilityLabel={data.title}
				/>
			) : null}

			<View className="gap-1.5">
				<Text variant="h2" className="border-0">
					{data.title}
				</Text>
				{data.label ? <Text variant="muted">{data.label}</Text> : null}
			</View>

			<Card className="gap-3 p-4">
				<View className="flex-row items-center gap-2.5">
					<Icon
						as={CalendarClock}
						size={18}
						className="text-muted-foreground"
					/>
					<Text className="text-foreground flex-1">
						{format(new Date(data.startsAt), "PPp")}
						{data.endsAt ? ` – ${format(new Date(data.endsAt), "PPp")}` : null}
					</Text>
				</View>
				{data.locationText ? (
					<View className="flex-row items-center gap-2.5">
						<Icon as={MapPin} size={18} className="text-muted-foreground" />
						<Text className="text-foreground flex-1">{data.locationText}</Text>
					</View>
				) : null}
				<View className="flex-row items-center gap-2.5">
					<Icon as={Users} size={18} className="text-muted-foreground" />
					<Text className="text-foreground flex-1">
						{data.attendeesCount}{" "}
						{data.attendeesCount === 1 ? "attendee" : "attendees"}
					</Text>
				</View>
				{data.website ? (
					<Button
						variant="outline"
						size="sm"
						onPress={() => openWebsite(data.website as string)}
						accessibilityRole="link"
						accessibilityLabel="Open event website"
						className="self-start"
					>
						<Icon as={Globe} size={16} className="text-foreground" />
						<Text>Visit website</Text>
					</Button>
				) : null}
			</Card>

			{data.tags.length > 0 ? (
				<View className="flex-row flex-wrap gap-1.5">
					{data.tags.map((tag) => (
						<Badge key={tag} variant="secondary">
							{tag}
						</Badge>
					))}
				</View>
			) : null}

			{data.description ? (
				<Text className="text-foreground leading-6">{data.description}</Text>
			) : null}

			<Button
				variant={attending ? "outline" : "default"}
				onPress={toggleAttend}
				disabled={pending || myAttending.isLoading}
				accessibilityRole="button"
				accessibilityLabel={
					attending ? "Leave this event" : "Attend this event"
				}
			>
				<Text>{attending ? "Attending" : "Attend"}</Text>
			</Button>
		</ScrollView>
	);
}
