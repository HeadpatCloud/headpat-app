import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns/format";
import { router, useLocalSearchParams } from "expo-router";
import { CalendarDays, MapPin, Users } from "@/components/icons";
import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { StorageImage } from "@/components/storage-image";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

export default function Community() {
	const { communityId } = useLocalSearchParams<{ communityId: string }>();
	const queryClient = useQueryClient();
	const [busy, setBusy] = useState(false);

	const community = useQuery(
		orpc.community.byId.queryOptions({ input: { communityId } }),
	);
	const myRole = useQuery(
		orpc.community.myRoleIn.queryOptions({ input: { communityId } }),
	);
	const followStatus = useQuery(
		orpc.community.followStatus.queryOptions({ input: { communityId } }),
	);
	const events = useQuery(
		orpc.event.listByCommunity.queryOptions({ input: { communityId } }),
	);

	// Optimistic: flip iFollow + followersCount in the cache immediately, roll
	// back on error — the tap must not wait on the network.
	async function toggleFollow() {
		if (busy) return;
		setBusy(true);
		const statusKey = orpc.community.followStatus.queryOptions({
			input: { communityId },
		}).queryKey;
		const byIdKey = orpc.community.byId.queryOptions({
			input: { communityId },
		}).queryKey;
		await Promise.all([
			queryClient.cancelQueries({ queryKey: statusKey }),
			queryClient.cancelQueries({ queryKey: byIdKey }),
		]);
		const prevStatus = queryClient.getQueryData(statusKey);
		const prevById = queryClient.getQueryData(byIdKey);
		const wasFollowing = followStatus.data?.iFollow ?? false;
		queryClient.setQueryData(
			statusKey,
			(old) => old && { ...old, iFollow: !wasFollowing },
		);
		queryClient.setQueryData(
			byIdKey,
			(old) =>
				old && {
					...old,
					followersCount: Math.max(
						old.followersCount + (wasFollowing ? -1 : 1),
						0,
					),
				},
		);
		try {
			if (wasFollowing) {
				await client.community.unfollow({ communityId });
			} else {
				await client.community.follow({ communityId });
			}
		} catch (e) {
			queryClient.setQueryData(statusKey, prevStatus);
			queryClient.setQueryData(byIdKey, prevById);
			Alert.alert("Couldn't update follow", humanizeError(e));
		} finally {
			queryClient.invalidateQueries({
				queryKey: orpc.community.followStatus.key({ input: { communityId } }),
			});
			queryClient.invalidateQueries({
				queryKey: orpc.community.byId.key({ input: { communityId } }),
			});
			setBusy(false);
		}
	}

	if (community.isLoading) {
		return (
			<View className="bg-background flex-1 gap-3 p-4">
				<Skeleton className="h-40 w-full" />
				<Skeleton className="h-8 w-2/3" />
				<Skeleton className="h-20 w-full" />
			</View>
		);
	}

	if (!community.data) {
		return (
			<View className="bg-background flex-1 p-4">
				<Text variant="muted">This community is no longer available.</Text>
			</View>
		);
	}

	const c = community.data;
	const iFollow = followStatus.data?.iFollow ?? false;
	const role = myRole.data?.role;
	const canManage =
		role === "admin" || role === "moderator" || role === "owner";

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{ paddingBottom: 32 }}
		>
			{c.bannerFileId ? (
				<StorageImage
					kind="community-banner"
					fileId={c.bannerFileId}
					variant="1600"
					style={{ width: "100%", height: 160 }}
					accessibilityLabel={`${c.name} banner`}
				/>
			) : (
				<View className="bg-muted h-40 w-full" />
			)}

			<View className="gap-4 p-4">
				<View className="flex-row items-center gap-3">
					<Avatar
						fileId={c.avatarFileId}
						name={c.name}
						kind="community-avatar"
						size={64}
						className="border-background -mt-12 border-4"
					/>
					<View className="flex-1 gap-0.5">
						<Text variant="h3">{c.name}</Text>
						<View className="flex-row items-center gap-1.5">
							<Icon as={Users} size={14} className="text-muted-foreground" />
							<Text variant="small" className="text-muted-foreground">
								{c.followersCount}{" "}
								{c.followersCount === 1 ? "follower" : "followers"}
							</Text>
						</View>
					</View>
				</View>

				<Button
					variant={iFollow ? "outline" : "default"}
					onPress={toggleFollow}
					disabled={followStatus.isLoading}
					accessibilityRole="button"
					accessibilityLabel={
						iFollow ? "Unfollow community" : "Follow community"
					}
				>
					<Text>{iFollow ? "Following" : "Follow"}</Text>
				</Button>

				{canManage ? (
					<Button
						variant="outline"
						onPress={() => router.push(`/community-admin/${communityId}`)}
						accessibilityRole="button"
						accessibilityLabel="Manage community"
					>
						<Text>Manage</Text>
					</Button>
				) : null}

				{c.description ? (
					<Text className="text-foreground leading-6">{c.description}</Text>
				) : null}

				{c.tags.length > 0 ? (
					<View className="flex-row flex-wrap gap-1.5">
						{c.tags.map((tag) => (
							<Badge key={tag} variant="secondary">
								{tag}
							</Badge>
						))}
					</View>
				) : null}

				<View className="gap-2 pt-2">
					<Text variant="small" className="text-muted-foreground uppercase">
						Events
					</Text>
					{events.isLoading ? (
						<Skeleton className="h-20 w-full" />
					) : events.data && events.data.length > 0 ? (
						events.data.map((e) => (
							<PressableScale
								key={e.id}
								haptic="selection"
								onPress={() => router.push(`/events/${e.id}`)}
								accessibilityRole="button"
								accessibilityLabel={e.title}
							>
								<Card className="gap-1.5 p-4">
									<Text variant="large" numberOfLines={1}>
										{e.title}
									</Text>
									<View className="flex-row items-center gap-1.5">
										<Icon
											as={CalendarDays}
											size={14}
											className="text-muted-foreground"
										/>
										<Text variant="small" className="text-muted-foreground">
											{format(new Date(e.startsAt), "PPp")}
										</Text>
									</View>
									{e.locationText ? (
										<View className="flex-row items-center gap-1.5">
											<Icon
												as={MapPin}
												size={14}
												className="text-muted-foreground"
											/>
											<Text
												variant="small"
												className="text-muted-foreground"
												numberOfLines={1}
											>
												{e.locationText}
											</Text>
										</View>
									) : null}
									<View className="flex-row items-center gap-1.5">
										<Icon
											as={Users}
											size={14}
											className="text-muted-foreground"
										/>
										<Text variant="small" className="text-muted-foreground">
											{e.attendeesCount} going
										</Text>
									</View>
								</Card>
							</PressableScale>
						))
					) : (
						<Text variant="muted">No events yet.</Text>
					)}
				</View>
			</View>
		</ScrollView>
	);
}
