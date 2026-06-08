import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { Heart, MessageCircle, Send } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { StorageImage } from "@/components/storage-image";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

export default function GalleryItem() {
	const { galleryId } = useLocalSearchParams<{ galleryId: string }>();
	const queryClient = useQueryClient();
	const [body, setBody] = useState("");
	const [liking, setLiking] = useState(false);
	const [sending, setSending] = useState(false);

	const item = useQuery(
		orpc.gallery.byId.queryOptions({ input: { itemId: galleryId } }),
	);
	const comments = useQuery(
		orpc.gallery.comments.queryOptions({ input: { itemId: galleryId } }),
	);

	async function toggleLike() {
		if (!item.data || liking) return;
		setLiking(true);
		try {
			if (item.data.likedByMe) {
				await client.gallery.unlike({ itemId: galleryId });
			} else {
				await client.gallery.like({ itemId: galleryId });
			}
			await queryClient.invalidateQueries({
				queryKey: orpc.gallery.byId.key(),
			});
		} catch (e) {
			Alert.alert("Couldn't update like", humanizeError(e));
		} finally {
			setLiking(false);
		}
	}

	async function sendComment() {
		const trimmed = body.trim();
		if (!trimmed || sending) return;
		setSending(true);
		try {
			await client.gallery.comment({ itemId: galleryId, body: trimmed });
			setBody("");
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: orpc.gallery.comments.key(),
				}),
				queryClient.invalidateQueries({ queryKey: orpc.gallery.byId.key() }),
			]);
		} catch (e) {
			Alert.alert("Couldn't post comment", humanizeError(e));
		} finally {
			setSending(false);
		}
	}

	if (item.isLoading) {
		return (
			<View className="bg-background flex-1 gap-3 p-4">
				<Skeleton className="aspect-square w-full rounded-xl" />
				<Skeleton className="h-7 w-2/3" />
				<Skeleton className="h-12 w-full" />
			</View>
		);
	}

	if (!item.data) {
		return (
			<View className="bg-background flex-1 p-4">
				<Text variant="muted">This gallery item is no longer available.</Text>
			</View>
		);
	}

	const { author } = item.data;

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{ padding: 16, gap: 16 }}
		>
			<StorageImage
				kind="gallery"
				fileId={item.data.fileId}
				blurhash={item.data.blurHash}
				style={{ aspectRatio: 1, width: "100%", borderRadius: 12 }}
				contentFit="contain"
				accessibilityLabel={item.data.name}
			/>

			<View className="gap-1">
				<Text variant="h3">{item.data.name}</Text>
				<Text variant="small" className="text-muted-foreground">
					{formatDistanceToNow(new Date(item.data.createdAt), {
						addSuffix: true,
					})}
				</Text>
			</View>

			{author ? (
				<Pressable
					onPress={() => router.push(`/user/${author.profileUrl}`)}
					accessibilityRole="button"
					accessibilityLabel={`View ${author.displayName ?? "user"}'s profile`}
				>
					<Card className="flex-row items-center gap-3 p-3">
						<Avatar
							fileId={author.avatarFileId}
							name={author.displayName}
							size={44}
						/>
						<View className="flex-1">
							<Text variant="large" numberOfLines={1}>
								{author.displayName ?? "Unknown"}
							</Text>
						</View>
					</Card>
				</Pressable>
			) : null}

			{item.data.longText ? (
				<Text className="text-foreground leading-6">{item.data.longText}</Text>
			) : null}

			{item.data.tags.length > 0 ? (
				<View className="flex-row flex-wrap gap-2">
					{item.data.tags.map((tag) => (
						<Badge key={tag} variant="secondary">
							{tag}
						</Badge>
					))}
				</View>
			) : null}

			<View className="flex-row items-center gap-3">
				<Button
					variant={item.data.likedByMe ? "default" : "outline"}
					size="sm"
					disabled={liking}
					onPress={toggleLike}
					accessibilityRole="button"
					accessibilityLabel={item.data.likedByMe ? "Unlike" : "Like"}
				>
					<Icon
						as={Heart}
						size={18}
						className={
							item.data.likedByMe
								? "text-primary-foreground"
								: "text-foreground"
						}
					/>
					<Text>{item.data.likesCount}</Text>
				</Button>
				<View className="flex-row items-center gap-1.5">
					<Icon
						as={MessageCircle}
						size={18}
						className="text-muted-foreground"
					/>
					<Text variant="muted">{item.data.commentsCount}</Text>
				</View>
			</View>

			<View className="gap-3">
				<Text variant="small" className="text-muted-foreground uppercase">
					Comments
				</Text>

				<View className="flex-row items-center gap-2">
					<Input
						className="flex-1"
						placeholder="Add a comment..."
						value={body}
						onChangeText={setBody}
						editable={!sending}
						accessibilityLabel="Comment input"
					/>
					<Button
						size="icon"
						disabled={sending || body.trim().length === 0}
						onPress={sendComment}
						accessibilityRole="button"
						accessibilityLabel="Send comment"
					>
						<Icon as={Send} size={18} className="text-primary-foreground" />
					</Button>
				</View>

				{comments.isLoading ? (
					<Skeleton className="h-16 w-full" />
				) : comments.data && comments.data.length > 0 ? (
					comments.data.map((c) => (
						<Card key={c.id} className="flex-row gap-3 p-3">
							<Avatar
								fileId={c.author.avatarFileId}
								name={c.author.displayName}
								size={36}
							/>
							<View className="flex-1 gap-0.5">
								<View className="flex-row items-center gap-2">
									<Text variant="small" className="flex-1" numberOfLines={1}>
										{c.author.displayName ?? "Unknown"}
									</Text>
									<Text variant="small" className="text-muted-foreground">
										{formatDistanceToNow(new Date(c.createdAt), {
											addSuffix: true,
										})}
									</Text>
								</View>
								<Text className="text-foreground text-sm">{c.body}</Text>
							</View>
						</Card>
					))
				) : (
					<Text variant="muted">No comments yet.</Text>
				)}
			</View>
		</ScrollView>
	);
}
