import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns/format";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { DateBlock } from "@/components/event/date-block";
import {
	CalendarClock,
	Check,
	Globe,
	MapPin,
	Pencil,
	Trash2,
	Users,
} from "@/components/icons";
import { StorageImage } from "@/components/storage-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { eventCollection } from "@/lib/db/collections";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { useOpenLink } from "@/lib/use-open-link";
import { usePlatformPermissions } from "@/lib/use-permissions";

export default function Event() {
	const { eventId } = useLocalSearchParams<{ eventId: string }>();
	const { t } = useI18n();
	const { data: session } = useSession();
	const queryClient = useQueryClient();
	const [pending, setPending] = useState(false);

	const { data: fetched, isLoading } = useQuery(
		orpc.event.byId.queryOptions({ input: { eventId } }),
	);
	// list and byId are the same bare select, so the list collection can stand in
	// for the detail row when the fetch is paused offline.
	const data = fetched ?? eventCollection.get(eventId);
	const myAttending = useQuery({
		...orpc.event.myAttending.queryOptions(),
		enabled: !!session,
	});

	const attending =
		myAttending.data?.some((row) => row.eventId === eventId) ?? false;

	const { can } = usePlatformPermissions();
	const isCreator = !!session && data?.creatorUserId === session.user.id;
	const canEdit = isCreator || can("events:edit");
	const canDelete = !!session && (isCreator || can("events:delete"));

	function deleteEvent() {
		Alert.alert(t("events.deleteEvent"), t("events.deleteConfirm"), [
			{ text: t("common.cancel"), style: "cancel" },
			{
				text: t("common.delete"),
				style: "destructive",
				onPress: async () => {
					try {
						await client.event.delete({ eventId });
						queryClient.invalidateQueries({ queryKey: orpc.event.list.key() });
						queryClient.invalidateQueries({
							queryKey: orpc.event.upcoming.key(),
						});
						router.back();
					} catch (e) {
						Alert.alert(t("events.deleteFailed"), humanizeError(e));
					}
				},
			},
		]);
	}

	async function toggleAttend() {
		if (!session) {
			router.push("/(auth)/login");
			return;
		}
		if (pending) return;
		setPending(true);
		const myKey = orpc.event.myAttending.queryOptions().queryKey;
		const byIdKey = orpc.event.byId.queryOptions({
			input: { eventId },
		}).queryKey;
		await Promise.all([
			queryClient.cancelQueries({ queryKey: myKey }),
			queryClient.cancelQueries({ queryKey: byIdKey }),
		]);
		const prevMy = queryClient.getQueryData(myKey);
		const prevById = queryClient.getQueryData(byIdKey);
		const wasAttending = attending;
		queryClient.setQueryData(myKey, (old) =>
			old
				? wasAttending
					? old.filter((row) => row.eventId !== eventId)
					: [
							...old,
							{
								eventId,
								userId: "",
								notify: false,
								remindedAt: null,
								createdAt: new Date(),
							},
						]
				: old,
		);
		queryClient.setQueryData(
			byIdKey,
			(old) =>
				old && {
					...old,
					attendeesCount: Math.max(
						old.attendeesCount + (wasAttending ? -1 : 1),
						0,
					),
				},
		);
		try {
			if (wasAttending) {
				await client.event.unattend({ eventId });
			} else {
				await client.event.attend({ eventId });
			}
		} catch (e) {
			queryClient.setQueryData(myKey, prevMy);
			queryClient.setQueryData(byIdKey, prevById);
			Alert.alert(t("events.attendFailed"), humanizeError(e));
		} finally {
			queryClient.invalidateQueries({
				queryKey: orpc.event.myAttending.key(),
			});
			queryClient.invalidateQueries({
				queryKey: orpc.event.byId.key({ input: { eventId } }),
			});
			setPending(false);
		}
	}

	const openWebsite = useOpenLink();

	if (isLoading && !data) {
		return (
			<View className="bg-background flex-1 gap-3 p-4">
				<Skeleton className="h-8 w-2/3" />
				<Skeleton className="h-48 w-full rounded-2xl" />
				<Skeleton className="h-24 w-full" />
			</View>
		);
	}

	if (!data) {
		return (
			<View className="bg-background flex-1 p-4">
				<Text variant="muted">{t("events.unavailable")}</Text>
			</View>
		);
	}

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{ padding: 16, gap: 16 }}
		>
			{data.images.length > 0 ? (
				<AnimatedEntrance index={0}>
					<View>
						<StorageImage
							kind="gallery"
							fileId={data.images[0]}
							variant="1280"
							priority="high"
							radius={16}
							style={{ width: "100%", height: 200 }}
							accessibilityLabel={data.title}
						/>
						<DateBlock
							date={new Date(data.startsAt)}
							size="lg"
							overlay
							className="absolute bottom-3 left-3 right-3"
						/>
					</View>
				</AnimatedEntrance>
			) : (
				<AnimatedEntrance index={0} preset="fadeUp">
					<DateBlock date={new Date(data.startsAt)} size="lg" />
				</AnimatedEntrance>
			)}

			<AnimatedEntrance index={1} preset="fadeUp">
				<View className="gap-1.5">
					<Text variant="h2">{data.title}</Text>
					{data.label ? <Text variant="muted">{data.label}</Text> : null}
				</View>
			</AnimatedEntrance>

			<AnimatedEntrance index={2} preset="fadeUp">
				<Card className="gap-3 p-4">
					<View className="flex-row items-start gap-2.5">
						<Icon
							as={CalendarClock}
							size={18}
							className="text-muted-foreground mt-0.5"
						/>
						<Text className="text-foreground flex-1">
							{format(new Date(data.startsAt), "PPp")}
							{data.endsAt
								? ` – ${format(new Date(data.endsAt), "PPp")}`
								: null}
						</Text>
					</View>
					{data.locationText ? (
						<View className="flex-row items-start gap-2.5">
							<Icon
								as={MapPin}
								size={18}
								className="text-muted-foreground mt-0.5"
							/>
							<Text className="text-foreground flex-1">
								{data.locationText}
							</Text>
						</View>
					) : null}
					<View className="flex-row items-start gap-2.5">
						<Icon
							as={Users}
							size={18}
							className="text-muted-foreground mt-0.5"
						/>
						<Text className="text-foreground flex-1">
							{t("events.attendees", { count: data.attendeesCount })}
						</Text>
					</View>
					{data.website ? (
						<Button
							variant="outline"
							size="sm"
							onPress={() => openWebsite(data.website as string)}
							accessibilityRole="link"
							accessibilityLabel={t("events.openWebsite")}
							className="self-start"
						>
							<Icon as={Globe} size={16} className="text-foreground" />
							<Text>{t("events.visitWebsite")}</Text>
						</Button>
					) : null}
				</Card>
			</AnimatedEntrance>

			{data.tags.length > 0 ? (
				<AnimatedEntrance index={3} preset="fadeUp">
					<View className="flex-row flex-wrap gap-1.5">
						{data.tags.map((tag) => (
							<Badge key={tag} variant="secondary">
								{tag}
							</Badge>
						))}
					</View>
				</AnimatedEntrance>
			) : null}

			{data.description ? (
				<AnimatedEntrance index={4} preset="fadeUp">
					<Text className="text-foreground leading-6">{data.description}</Text>
				</AnimatedEntrance>
			) : null}

			<AnimatedEntrance index={5} preset="fadeUp">
				<Button
					variant={attending ? "outline" : "default"}
					fullWidth
					onPress={toggleAttend}
					disabled={pending || (!!session && myAttending.isLoading)}
					accessibilityRole="button"
					accessibilityLabel={
						attending ? t("events.leaveHint") : t("events.attendHint")
					}
				>
					{attending ? (
						<Icon as={Check} size={18} className="text-foreground" />
					) : null}
					<Text>{attending ? t("events.attending") : t("events.attend")}</Text>
				</Button>
			</AnimatedEntrance>

			{canEdit || canDelete ? (
				<AnimatedEntrance index={6} preset="fadeUp">
					<View className="flex-row gap-3">
						{canEdit ? (
							<View className="flex-1">
								<Button
									variant="outline"
									fullWidth
									onPress={() => router.push(`/event/edit/${eventId}`)}
									accessibilityRole="button"
									accessibilityLabel={t("titles.eventEdit")}
								>
									<Icon as={Pencil} size={18} className="text-foreground" />
									<Text>{t("titles.eventEdit")}</Text>
								</Button>
							</View>
						) : null}
						{canDelete ? (
							<View className="flex-1">
								<Button
									variant="ghost"
									fullWidth
									onPress={deleteEvent}
									accessibilityRole="button"
									accessibilityLabel={t("events.deleteEvent")}
								>
									<Icon as={Trash2} size={18} className="text-destructive" />
									<Text className="text-destructive">
										{t("events.deleteEvent")}
									</Text>
								</Button>
							</View>
						) : null}
					</View>
				</AnimatedEntrance>
			) : null}
		</ScrollView>
	);
}
