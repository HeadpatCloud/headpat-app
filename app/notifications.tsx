import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
	useInfiniteQuery,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { type Href, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSpring,
} from "react-native-reanimated";
import { EmptyState } from "@/components/empty-state";
import {
	Bell,
	BellOff,
	CalendarClock,
	CheckCheck,
	ChevronRight,
	LifeBuoy,
	type LucideIcon,
	MessageSquare,
	MessagesSquare,
	ShieldCheck,
	Trash2,
	UserPlus,
} from "@/components/icons";
import { PaginatedList } from "@/components/paginated-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlowShadow, Gradient } from "@/components/ui/gradient";
import { GradientText } from "@/components/ui/gradient-text";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { appRoute } from "@/lib/app-route";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { springs } from "@/lib/motion/springs";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { useTheme } from "@/lib/theme/provider";
import { cn } from "@/lib/utils";

type NotificationItem = Awaited<
	ReturnType<typeof client.notification.list>
>["items"][number];

const TYPE_ICONS: Record<string, LucideIcon> = {
	newFollower: UserPlus,
	newMessage: MessagesSquare,
	ticketReply: LifeBuoy,
	reportResolved: ShieldCheck,
	eventReminder: CalendarClock,
	galleryComment: MessageSquare,
};

function NotificationRow({
	item,
	rippleOrder,
	onPress,
	onLongPress,
}: {
	item: NotificationItem;
	rippleOrder?: number;
	onPress: () => void;
	onLongPress: () => void;
}) {
	const { t } = useI18n();
	const { glow } = useTheme();
	const reduced = useReducedMotion();
	const unread = useSharedValue(item.read ? 0 : 1);
	const prevId = useRef(item.id);

	// Animate only a read-flip of the same row; on FlashList recycle (id change)
	// snap to the new item's state so scrolling never replays the fade.
	useEffect(() => {
		const target = item.read ? 0 : 1;
		if (prevId.current !== item.id || reduced) {
			prevId.current = item.id;
			unread.value = target;
			return;
		}
		// markAllRead ripples the read-flip down the visible rows (~50ms apart)
		unread.value =
			target === 0 && rippleOrder !== undefined
				? withDelay(rippleOrder * 50, withSpring(target, springs.gentle))
				: withSpring(target, springs.gentle);
	}, [item.id, item.read, reduced, unread, rippleOrder]);

	const accentStyle = useAnimatedStyle(() => ({ opacity: unread.value }));
	const bodyStyle = useAnimatedStyle(() => ({
		opacity: 0.7 + unread.value * 0.3,
	}));

	const route = appRoute(item.link);

	return (
		<PressableScale
			haptic="selection"
			onPress={onPress}
			onLongPress={onLongPress}
			accessibilityRole="button"
			accessibilityLabel={item.message}
			accessibilityHint={t("notifications.holdForOptions")}
		>
			<Animated.View style={bodyStyle}>
				<Card className="rounded-xl p-4">
					<Animated.View
						style={[styles.rail, accentStyle]}
						pointerEvents="none"
					>
						<Gradient
							style={styles.railFill}
							start={{ x: 0, y: 0 }}
							end={{ x: 0, y: 1 }}
						/>
					</Animated.View>
					<View className="flex-row items-center gap-3">
						<View className="h-11 w-11">
							<Animated.View
								style={[styles.glyphGlow, GlowShadow(glow), accentStyle]}
								pointerEvents="none"
							/>
							<View className="bg-primary/15 h-11 w-11 items-center justify-center rounded-full">
								<Icon
									as={TYPE_ICONS[item.type] ?? Bell}
									size={20}
									className="text-primary"
								/>
							</View>
						</View>
						<View className="flex-1 gap-0.5">
							<Text className="font-medium" numberOfLines={2}>
								{item.message}
							</Text>
							<Text variant="small" className="text-muted-foreground">
								{formatDistanceToNow(new Date(item.createdAt), {
									addSuffix: true,
								})}
							</Text>
						</View>
						{route ? (
							<Icon
								as={ChevronRight}
								size={18}
								className="text-muted-foreground"
							/>
						) : null}
					</View>
					<Animated.View
						style={accentStyle}
						pointerEvents="none"
						className="bg-primary absolute right-3 top-3 h-2 w-2 rounded-full"
					/>
				</Card>
			</Animated.View>
		</PressableScale>
	);
}

function SheetAction({
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

function NotificationsInbox() {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const sheetRef = useRef<BottomSheetModal>(null);
	const [selected, setSelected] = useState<NotificationItem | null>(null);
	const [busy, setBusy] = useState(false);

	const listOptions = orpc.notification.list.infiniteOptions({
		input: (page: number) => ({ page, pageSize: 24 }),
		initialPageParam: 1,
		getNextPageParam: (last) =>
			last.page * last.pageSize < last.total ? last.page + 1 : undefined,
	});
	const query = useInfiniteQuery(listOptions);
	const countOptions = orpc.notification.unreadCount.queryOptions();
	const countQuery = useQuery(countOptions);
	// If the count query fails, fall back to the loaded rows so the header
	// never claims "all caught up" while unread rows are visible.
	const loadedUnread =
		query.data?.pages.flatMap((p) => p.items).filter((n) => !n.read).length ??
		0;
	const unread = countQuery.isError
		? loadedUnread
		: (countQuery.data?.count ?? 0);
	const rippleRef = useRef<Map<string, number>>(new Map());

	function invalidate() {
		queryClient.invalidateQueries({ queryKey: orpc.notification.list.key() });
		queryClient.invalidateQueries({
			queryKey: orpc.notification.unreadCount.key(),
		});
	}

	// Optimistic: flip the cached row + count immediately, roll back on error.
	async function markRead(id: string) {
		await Promise.all([
			queryClient.cancelQueries({ queryKey: listOptions.queryKey }),
			queryClient.cancelQueries({ queryKey: countOptions.queryKey }),
		]);
		const prevList = queryClient.getQueryData(listOptions.queryKey);
		const prevCount = queryClient.getQueryData(countOptions.queryKey);
		queryClient.setQueryData(
			listOptions.queryKey,
			(old) =>
				old && {
					...old,
					pages: old.pages.map((p) => ({
						...p,
						items: p.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
					})),
				},
		);
		queryClient.setQueryData(
			countOptions.queryKey,
			(old) => old && { count: Math.max(old.count - 1, 0) },
		);
		try {
			await client.notification.markRead({ notificationId: id });
		} catch (e) {
			queryClient.setQueryData(listOptions.queryKey, prevList);
			queryClient.setQueryData(countOptions.queryKey, prevCount);
			Alert.alert(t("notifications.markReadError"), humanizeError(e));
		} finally {
			invalidate();
		}
	}

	async function markAllRead() {
		if (busy || unread === 0) return;
		setBusy(true);
		await Promise.all([
			queryClient.cancelQueries({ queryKey: listOptions.queryKey }),
			queryClient.cancelQueries({ queryKey: countOptions.queryKey }),
		]);
		const prevList = queryClient.getQueryData(listOptions.queryKey);
		const prevCount = queryClient.getQueryData(countOptions.queryKey);
		// Stagger order for the read-flip ripple, in list order.
		const ripple = new Map<string, number>();
		for (const p of prevList?.pages ?? [])
			for (const n of p.items) if (!n.read) ripple.set(n.id, ripple.size);
		rippleRef.current = ripple;
		queryClient.setQueryData(
			listOptions.queryKey,
			(old) =>
				old && {
					...old,
					pages: old.pages.map((p) => ({
						...p,
						items: p.items.map((n) => (n.read ? n : { ...n, read: true })),
					})),
				},
		);
		queryClient.setQueryData(countOptions.queryKey, { count: 0 });
		try {
			await client.notification.markAllRead();
		} catch (e) {
			rippleRef.current = new Map();
			queryClient.setQueryData(listOptions.queryKey, prevList);
			queryClient.setQueryData(countOptions.queryKey, prevCount);
			Alert.alert(t("notifications.markAllReadError"), humanizeError(e));
		} finally {
			invalidate();
			setBusy(false);
		}
	}

	async function deleteSelected() {
		if (!selected || busy) return;
		setBusy(true);
		sheetRef.current?.dismiss();
		const wasUnread = !selected.read;
		const id = selected.id;
		await Promise.all([
			queryClient.cancelQueries({ queryKey: listOptions.queryKey }),
			queryClient.cancelQueries({ queryKey: countOptions.queryKey }),
		]);
		const prevList = queryClient.getQueryData(listOptions.queryKey);
		const prevCount = queryClient.getQueryData(countOptions.queryKey);
		queryClient.setQueryData(
			listOptions.queryKey,
			(old) =>
				old && {
					...old,
					pages: old.pages.map((p) => ({
						...p,
						items: p.items.filter((n) => n.id !== id),
						total: Math.max(p.total - 1, 0),
					})),
				},
		);
		if (wasUnread) {
			queryClient.setQueryData(
				countOptions.queryKey,
				(old) => old && { count: Math.max(old.count - 1, 0) },
			);
		}
		try {
			await client.notification.delete({ notificationId: id });
		} catch (e) {
			queryClient.setQueryData(listOptions.queryKey, prevList);
			queryClient.setQueryData(countOptions.queryKey, prevCount);
			Alert.alert(t("notifications.deleteError"), humanizeError(e));
		} finally {
			invalidate();
			setBusy(false);
		}
	}

	function openRow(item: NotificationItem) {
		if (!item.read) markRead(item.id);
		const route = appRoute(item.link);
		// server links are prefix-validated in appRoute but built at runtime,
		// so they can't satisfy the static Href union
		if (route) router.push(route as Href);
	}

	return (
		<View className="bg-background flex-1">
			<View className="gap-1 px-4 pb-1 pt-4">
				<GradientText className="text-3xl font-extrabold leading-9 tracking-tight">
					{t("notifications.title")}
				</GradientText>
				<View className="flex-row items-center justify-between gap-2">
					<Text variant="muted">
						{unread > 0
							? t("notifications.unreadSummary", { count: unread })
							: t("notifications.allCaughtUp")}
					</Text>
					<Button
						variant="ghost"
						size="sm"
						disabled={unread === 0 || busy}
						onPress={markAllRead}
						accessibilityLabel={t("notifications.markAllRead")}
					>
						<Icon as={CheckCheck} size={18} />
						<Text>{t("notifications.markAllRead")}</Text>
					</Button>
				</View>
			</View>

			<View className="flex-1">
				<PaginatedList
					query={query}
					keyExtractor={(n) => n.id}
					emptyIcon={BellOff}
					emptyTitle={t("notifications.emptyTitle")}
					emptySubtitle={t("notifications.emptySubtitle")}
					renderItem={(n) => (
						<NotificationRow
							item={n}
							rippleOrder={rippleRef.current.get(n.id)}
							onPress={() => openRow(n)}
							onLongPress={() => {
								setSelected(n);
								sheetRef.current?.present();
							}}
						/>
					)}
				/>
			</View>

			<Sheet ref={sheetRef} title={t("notifications.notification")} accent>
				<View className="gap-1">
					{selected && !selected.read ? (
						<SheetAction
							icon={CheckCheck}
							label={t("notifications.markRead")}
							disabled={busy}
							onPress={() => {
								sheetRef.current?.dismiss();
								if (selected && !selected.read) markRead(selected.id);
							}}
						/>
					) : null}
					<SheetAction
						icon={Trash2}
						label={t("common.delete")}
						destructive
						disabled={busy}
						onPress={deleteSelected}
					/>
				</View>
			</Sheet>
		</View>
	);
}

export default function Notifications() {
	const { t } = useI18n();
	const { data: session, isPending } = useSession();

	if (!session) {
		if (isPending) return <View className="bg-background flex-1" />;
		return (
			<View className="bg-background flex-1 justify-center">
				<EmptyState
					icon={Bell}
					title={t("notifications.signInTitle")}
					subtitle={t("notifications.signInSubtitle")}
					action={{
						label: t("notifications.signIn"),
						onPress: () => router.push("/(auth)/login"),
					}}
				/>
			</View>
		);
	}

	return <NotificationsInbox />;
}

const styles = StyleSheet.create({
	rail: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
	railFill: { flex: 1 },
	glyphGlow: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		borderRadius: 22,
	},
});
