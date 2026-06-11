import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
} from "react-native-reanimated";
import { EmptyState } from "@/components/empty-state";
import {
	ChevronRight,
	Heart,
	ImageOff,
	type LucideIcon,
	MessageCircle,
	Send,
	Trash2,
	UserRound,
} from "@/components/icons";
import { StorageImage } from "@/components/storage-image";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlowShadow, Gradient } from "@/components/ui/gradient";
import { GradientText } from "@/components/ui/gradient-text";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatPill } from "@/components/ui/stat-pill";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { springs } from "@/lib/motion/springs";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { useTheme } from "@/lib/theme/provider";
import { usePlatformPermissions } from "@/lib/use-permissions";
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
	const { glow, colors } = useTheme();
	const { t } = useI18n();
	const reduced = useReducedMotion();
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
	const { can } = usePlatformPermissions();
	const canModerate = can("gallery:delete");
	const isOwnPost = !!session && item.data?.author?.userId === session.user.id;

	const sheetRef = useRef<BottomSheetModal>(null);
	const [selected, setSelected] = useState<
		NonNullable<typeof comments.data>[number] | null
	>(null);
	const [deleting, setDeleting] = useState(false);

	const liked = item.data?.likedByMe ?? false;
	const heartScale = useSharedValue(1);
	const prevLiked = useRef<boolean | null>(null);
	// Pop only on the false -> true flip after data has loaded, so the first
	// resolved value (liked on a cold cache) never animates.
	useEffect(() => {
		if (liked && prevLiked.current === false && !reduced) {
			heartScale.value = withSequence(
				withSpring(1.25, springs.snappy),
				withSpring(1, springs.gentle),
			);
		}
		prevLiked.current = item.data ? liked : null;
	}, [liked, reduced, heartScale, item.data]);
	const heartStyle = useAnimatedStyle(() => ({
		transform: [{ scale: heartScale.value }],
	}));

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
			Alert.alert(t("gallery.deleteCommentError"), humanizeError(e));
		} finally {
			setDeleting(false);
		}
	}

	function deletePost() {
		Alert.alert(t("gallery.deletePost"), t("gallery.deletePostConfirm"), [
			{ text: t("common.cancel"), style: "cancel" },
			{
				text: t("common.delete"),
				style: "destructive",
				onPress: async () => {
					try {
						await client.gallery.delete({ itemId: galleryId });
						queryClient.invalidateQueries({
							queryKey: orpc.gallery.list.key(),
						});
						router.back();
					} catch (e) {
						Alert.alert(t("gallery.deleteFailed"), humanizeError(e));
					}
				},
			},
		]);
	}

	// Optimistic: flip the cached item immediately, roll back on error. The tap
	// must never wait on the network for visual feedback.
	async function toggleLike() {
		if (!session) {
			router.push("/(auth)/login");
			return;
		}
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
			Alert.alert(t("gallery.likeError"), humanizeError(e));
		} finally {
			queryClient.invalidateQueries({
				queryKey: orpc.gallery.byId.key({ input: { itemId: galleryId } }),
			});
			setLiking(false);
		}
	}

	async function sendComment() {
		if (!session) {
			router.push("/(auth)/login");
			return;
		}
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
			Alert.alert(t("gallery.commentError"), humanizeError(e));
		} finally {
			setSending(false);
		}
	}

	if (item.isLoading) {
		return (
			<View className="bg-background flex-1 gap-4 p-4">
				<Skeleton className="aspect-square w-full rounded-3xl" />
				<Skeleton className="h-8 w-2/3 rounded-xl" />
				<Skeleton className="h-14 w-full rounded-2xl" />
			</View>
		);
	}

	if (!item.data) {
		return (
			<View className="bg-background flex-1 justify-center">
				<EmptyState icon={ImageOff} title={t("gallery.unavailable")} />
			</View>
		);
	}

	const { author } = item.data;
	const unknown = t("gallery.unknownUser");

	return (
		<>
			<ScrollView
				className="bg-background flex-1"
				contentContainerStyle={{ padding: 16, gap: 16 }}
			>
				<AnimatedEntrance index={0}>
					<View style={[GlowShadow(glow), { borderRadius: 24 }]}>
						<StorageImage
							kind="gallery"
							fileId={item.data.fileId}
							variant="1280"
							priority="high"
							blurhash={item.data.blurHash}
							style={{ aspectRatio: 1, width: "100%", borderRadius: 24 }}
							contentFit="contain"
							accessibilityLabel={item.data.name}
						/>
					</View>
				</AnimatedEntrance>

				<AnimatedEntrance index={1}>
					<View className="gap-1.5">
						<GradientText
							heading
							className="text-3xl font-extrabold leading-9 tracking-tight"
						>
							{item.data.name}
						</GradientText>
						<View className="flex-row items-center gap-2.5">
							<Gradient borderRadius={999} style={{ height: 3, width: 40 }} />
							<Text variant="small" className="text-muted-foreground">
								{formatDistanceToNow(new Date(item.data.createdAt), {
									addSuffix: true,
								})}
							</Text>
						</View>
					</View>
				</AnimatedEntrance>

				{author ? (
					<AnimatedEntrance index={2}>
						<PressableScale
							onPress={() => router.push(`/user/${author.profileUrl}`)}
							haptic="selection"
							accessibilityRole="button"
							accessibilityLabel={t("gallery.viewProfileOf", {
								name: author.displayName ?? unknown,
							})}
						>
							<Card className="flex-row items-center gap-3 p-4">
								<Avatar
									fileId={author.avatarFileId}
									name={author.displayName}
									size={44}
								/>
								<View className="flex-1">
									<Text variant="large" numberOfLines={1}>
										{author.displayName ?? unknown}
									</Text>
								</View>
								<Icon
									as={ChevronRight}
									size={20}
									className="text-muted-foreground"
								/>
							</Card>
						</PressableScale>
					</AnimatedEntrance>
				) : null}

				{item.data.longText || item.data.tags.length > 0 ? (
					<AnimatedEntrance index={3} className="gap-3">
						{item.data.longText ? (
							<Text variant="body" className="text-foreground">
								{item.data.longText}
							</Text>
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
					</AnimatedEntrance>
				) : null}

				<AnimatedEntrance index={4}>
					<View className="flex-row items-center gap-3">
						<Button
							variant={liked ? "default" : "outline"}
							size="sm"
							onPress={toggleLike}
							accessibilityRole="button"
							accessibilityLabel={
								liked ? t("gallery.unlike") : t("gallery.like")
							}
						>
							<Animated.View style={heartStyle}>
								<Icon
									as={Heart}
									size={18}
									className={
										liked ? "text-primary-foreground" : "text-foreground"
									}
									fill={liked ? colors["primary-foreground"] : "transparent"}
								/>
							</Animated.View>
							<Text>{item.data.likesCount}</Text>
						</Button>
						<StatPill
							icon={MessageCircle}
							value={item.data.commentsCount}
							label={t("gallery.comments")}
						/>
						{isOwnPost || canModerate ? (
							<View className="ml-auto">
								<Button
									variant="ghost"
									size="sm"
									onPress={deletePost}
									accessibilityRole="button"
									accessibilityLabel={t("gallery.deletePost")}
								>
									<Icon as={Trash2} size={18} className="text-destructive" />
								</Button>
							</View>
						) : null}
					</View>
				</AnimatedEntrance>

				<AnimatedEntrance index={5} className="gap-3">
					<SectionHeader accent title={t("gallery.comments")} />

					<View className="flex-row items-center gap-2">
						<Input
							containerClassName="flex-1"
							placeholder={t("gallery.commentPlaceholder")}
							value={body}
							onChangeText={setBody}
							accessibilityLabel={t("gallery.commentInput")}
						/>
						<Button
							size="icon"
							loading={sending}
							disabled={body.trim().length === 0}
							onPress={sendComment}
							accessibilityRole="button"
							accessibilityLabel={t("gallery.sendComment")}
						>
							<Icon as={Send} size={18} className="text-primary-foreground" />
						</Button>
					</View>

					{comments.isLoading ? (
						<Skeleton className="h-16 w-full rounded-2xl" />
					) : comments.data && comments.data.length > 0 ? (
						comments.data.map((c, i) => (
							<AnimatedEntrance key={c.id} index={i} preset="fadeUp">
								<PressableScale
									haptic="selection"
									onLongPress={() => {
										setSelected(c);
										sheetRef.current?.present();
									}}
									accessibilityLabel={t("gallery.commentBy", {
										name: c.author.displayName ?? unknown,
									})}
									accessibilityHint={t("gallery.holdForOptions")}
								>
									<Card className="flex-row gap-3 p-3.5">
										<Avatar
											fileId={c.author.avatarFileId}
											name={c.author.displayName}
											size={36}
										/>
										<View className="flex-1 gap-0.5">
											<View className="flex-row items-center gap-2">
												<Text
													variant="small"
													className="flex-1"
													numberOfLines={1}
												>
													{c.author.displayName ?? unknown}
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
							</AnimatedEntrance>
						))
					) : (
						<Text variant="muted">{t("gallery.noComments")}</Text>
					)}
				</AnimatedEntrance>
			</ScrollView>

			<Sheet ref={sheetRef} title={t("gallery.comment")} accent>
				<View className="gap-1">
					<CommentAction
						icon={UserRound}
						label={t("gallery.viewProfile")}
						onPress={viewProfile}
					/>
					{canDelete ? (
						<CommentAction
							icon={Trash2}
							label={t("gallery.deleteComment")}
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
