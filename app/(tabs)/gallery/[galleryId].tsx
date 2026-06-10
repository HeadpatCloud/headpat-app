import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { router, useLocalSearchParams } from "expo-router";
import {
	Heart,
	type LucideIcon,
	MessageCircle,
	Send,
	Trash2,
	UserRound,
} from "@/components/icons";
import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { StorageImage } from "@/components/storage-image";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { cn } from "@/lib/utils";

function CommentAction({
	icon,
	label,
	destructive,
	disabled,
	onPress,
}: {
	icon: LucideIcon;
	label: string;
	destructive?: boolean;
	disabled?: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityLabel={label}
			className="active:bg-accent/50 flex-row items-center gap-3 rounded-xl py-3.5"
		>
			<Icon
				as={icon}
				size={18}
				className={destructive ? "text-destructive" : "text-foreground"}
			/>
			<Text
				className={cn(
					"font-medium",
					destructive ? "text-destructive" : "text-foreground",
				)}
			>
				{label}
			</Text>
		</Pressable>
	);
}

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

	const { data: session } = useSession();
	const perms = useQuery({
		...orpc.adminRole.myPermissions.queryOptions(),
		enabled: !!session,
	});
	const canModerate = (perms.data ?? []).some(
		(p) => p === "*:*" || p === "gallery:*" || p === "gallery:delete",
	);

	const sheetRef = useRef<BottomSheetModal>(null);
	const [selected, setSelected] = useState<
		NonNullable<typeof comments.data>[number] | null
	>(null);
	const [deleting, setDeleting] = useState(false);

	const myId = session?.user.id;
	const canDelete =
		!!selected &&
		!!myId &&
		(selected.author.userId === myId ||
			item.data?.author?.userId === myId ||
			canModerate);

	function viewProfile() {
		if (!selected) return;
		sheetRef.current?.dismiss();
		router.push(`/user/${selected.author.profileUrl}`);
	}

	async function deleteSelected() {
		if (!selected || deleting) return;
		setDeleting(true);
		try {
			await client.gallery.deleteComment({ commentId: selected.id });
			sheetRef.current?.dismiss();
			queryClient.invalidateQueries({
				queryKey: orpc.gallery.comments.key({ input: { itemId: galleryId } }),
			});
			queryClient.invalidateQueries({
				queryKey: orpc.gallery.byId.key({ input: { itemId: galleryId } }),
			});
		} catch (e) {
			Alert.alert("Couldn't delete comment", humanizeError(e));
		} finally {
			setDeleting(false);
		}
	}

	// Optimistic: flip the cached item immediately, roll back on error. The tap
	// must never wait on the network for visual feedback.
	async function toggleLike() {
		if (!item.data || liking) return;
		setLiking(true);
		const key = orpc.gallery.byId.queryOptions({
			input: { itemId: galleryId },
		}).queryKey;
		await queryClient.cancelQueries({ queryKey: key });
		const prev = queryClient.getQueryData(key);
		const wasLiked = item.data.likedByMe;
		queryClient.setQueryData(
			key,
			(old) =>
				old && {
					...old,
					likedByMe: !old.likedByMe,
					likesCount: old.likedByMe
						? Math.max(old.likesCount - 1, 0)
						: old.likesCount + 1,
				},
		);
		try {
			if (wasLiked) {
				await client.gallery.unlike({ itemId: galleryId });
			} else {
				await client.gallery.like({ itemId: galleryId });
			}
		} catch (e) {
			queryClient.setQueryData(key, prev);
			Alert.alert("Couldn't update like", humanizeError(e));
		} finally {
			queryClient.invalidateQueries({
				queryKey: orpc.gallery.byId.key({ input: { itemId: galleryId } }),
			});
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
			queryClient.invalidateQueries({
				queryKey: orpc.gallery.comments.key({ input: { itemId: galleryId } }),
			});
			queryClient.invalidateQueries({
				queryKey: orpc.gallery.byId.key({ input: { itemId: galleryId } }),
			});
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
		<>
			<ScrollView
				className="bg-background flex-1"
				contentContainerStyle={{ padding: 16, gap: 16 }}
			>
			<StorageImage
				kind="gallery"
				fileId={item.data.fileId}
				variant="1280"
				priority="high"
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
				<PressableScale
					onPress={() => router.push(`/user/${author.profileUrl}`)}
					haptic="selection"
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
				</PressableScale>
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
						containerClassName="flex-1"
						placeholder="Add a comment..."
						value={body}
						onChangeText={setBody}
						accessibilityLabel="Comment input"
					/>
					<Button
						size="icon"
						loading={sending}
						disabled={body.trim().length === 0}
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
						<PressableScale
							key={c.id}
							haptic="selection"
							onLongPress={() => {
								setSelected(c);
								sheetRef.current?.present();
							}}
							accessibilityLabel={`Comment by ${c.author.displayName ?? "Unknown"}`}
							accessibilityHint="Hold for options"
						>
							<Card className="flex-row gap-3 p-3">
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
						</PressableScale>
					))
				) : (
					<Text variant="muted">No comments yet.</Text>
				)}
			</View>
		</ScrollView>

			<Sheet ref={sheetRef} title="Comment" accent>
				<View className="gap-1">
					<CommentAction
						icon={UserRound}
						label="View profile"
						onPress={viewProfile}
					/>
					{canDelete ? (
						<CommentAction
							icon={Trash2}
							label="Delete comment"
							destructive
							disabled={deleting}
							onPress={deleteSelected}
						/>
					) : null}
				</View>
			</Sheet>
		</>
	);
}
