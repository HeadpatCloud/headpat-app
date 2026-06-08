import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
	AtSign,
	type LucideIcon,
	MessageCircle,
	Send,
	Twitch,
} from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { StorageImage } from "@/components/storage-image";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

function SocialRow({ icon, label }: { icon: LucideIcon; label: string }) {
	return (
		<View className="flex-row items-center gap-2">
			<Icon as={icon} size={16} className="text-muted-foreground" />
			<Text className="text-foreground">{label}</Text>
		</View>
	);
}

export default function UserProfile() {
	const { profileUrl } = useLocalSearchParams<{ profileUrl: string }>();
	const queryClient = useQueryClient();
	const [pending, setPending] = useState(false);

	const profile = useQuery(
		orpc.profile.byUrl.queryOptions({ input: { profileUrl } }),
	);

	const targetUserId = profile.data?.userId;
	const follow = useQuery({
		...orpc.follow.status.queryOptions({
			input: { targetUserId: targetUserId ?? "" },
		}),
		enabled: !!targetUserId,
	});

	if (profile.isLoading) {
		return (
			<View className="bg-background flex-1 gap-3 p-4">
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-16 w-16 rounded-full" />
				<Skeleton className="h-6 w-1/2" />
				<Skeleton className="h-20 w-full" />
			</View>
		);
	}

	if (!profile.data) {
		return (
			<View className="bg-background flex-1 p-4">
				<Text variant="muted">This profile is no longer available.</Text>
			</View>
		);
	}

	const p = profile.data;

	async function toggleFollow() {
		if (!targetUserId || !follow.data) return;
		setPending(true);
		try {
			if (follow.data.iFollow) {
				await client.follow.remove({ targetUserId });
			} else {
				await client.follow.add({ targetUserId });
			}
			await queryClient.invalidateQueries({
				queryKey: orpc.follow.status.key(),
			});
			await queryClient.invalidateQueries({
				queryKey: orpc.profile.byUrl.key(),
			});
		} catch (e) {
			Alert.alert("Couldn't update follow", humanizeError(e));
		} finally {
			setPending(false);
		}
	}

	const socials: { icon: LucideIcon; label: string }[] = [];
	if (p.discordName)
		socials.push({ icon: MessageCircle, label: p.discordName });
	if (p.telegramName) socials.push({ icon: Send, label: p.telegramName });
	if (p.furaffinityName)
		socials.push({ icon: AtSign, label: p.furaffinityName });
	if (p.xName) socials.push({ icon: AtSign, label: p.xName });
	if (p.twitchName) socials.push({ icon: Twitch, label: p.twitchName });
	if (p.blueskyName) socials.push({ icon: AtSign, label: p.blueskyName });

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{ paddingBottom: 32 }}
		>
			<View className="bg-muted h-36 w-full">
				{p.bannerFileId ? (
					<StorageImage
						kind="banner"
						fileId={p.bannerFileId}
						style={{ width: "100%", height: "100%" }}
						accessibilityLabel={`${p.displayName ?? p.profileUrl} banner`}
					/>
				) : null}
			</View>

			<View className="-mt-10 gap-4 px-4">
				<Avatar
					fileId={p.avatarFileId}
					name={p.displayName ?? p.name}
					kind="avatar"
					size={80}
					className="border-background border-4"
				/>

				<View className="gap-1">
					<View className="flex-row items-center gap-2">
						<Text variant="h3">{p.displayName ?? p.profileUrl}</Text>
						{p.pronouns ? <Badge variant="outline">{p.pronouns}</Badge> : null}
					</View>
					<Text variant="muted">@{p.profileUrl}</Text>
				</View>

				{follow.data ? (
					<Button
						variant={follow.data.iFollow ? "outline" : "default"}
						disabled={pending}
						onPress={toggleFollow}
						accessibilityRole="button"
						accessibilityLabel={follow.data.iFollow ? "Unfollow" : "Follow"}
					>
						<Text>{follow.data.iFollow ? "Unfollow" : "Follow"}</Text>
					</Button>
				) : null}

				<View className="flex-row gap-6">
					<Pressable
						onPress={() => router.push(`/user/${p.profileUrl}/followers`)}
						accessibilityRole="button"
						accessibilityLabel={`${p.followersCount} followers`}
					>
						<Text className="text-foreground font-semibold">
							{p.followersCount}{" "}
							<Text className="text-muted-foreground font-normal">
								Followers
							</Text>
						</Text>
					</Pressable>
					<Pressable
						onPress={() => router.push(`/user/${p.profileUrl}/following`)}
						accessibilityRole="button"
						accessibilityLabel={`${p.followingCount} following`}
					>
						<Text className="text-foreground font-semibold">
							{p.followingCount}{" "}
							<Text className="text-muted-foreground font-normal">
								Following
							</Text>
						</Text>
					</Pressable>
				</View>

				{p.bio ? (
					<Text className="text-foreground leading-6">{p.bio}</Text>
				) : null}

				{p.location ? (
					<Text variant="small" className="text-muted-foreground">
						{p.location}
					</Text>
				) : null}

				{socials.length > 0 ? (
					<View className="gap-2">
						<Text variant="small" className="text-muted-foreground uppercase">
							Socials
						</Text>
						{socials.map((s) => (
							<SocialRow key={s.label} icon={s.icon} label={s.label} />
						))}
					</View>
				) : null}

				{p.badges.length > 0 ? (
					<View className="flex-row flex-wrap gap-2">
						{p.badges.map((b) => (
							<Badge key={b} variant="secondary">
								{b}
							</Badge>
						))}
					</View>
				) : null}
			</View>
		</ScrollView>
	);
}
