import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import {
	type InfiniteData,
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Composer } from "@/components/chat/composer";
import { ConversationAvatar } from "@/components/chat/conversation-avatar";
import { MessageRow, type MessageRowData } from "@/components/chat/message-row";
import { EmptyState } from "@/components/empty-state";
import { MessagesSquare, Pencil, Trash2 } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import {
	type ChatMessage,
	conversationTitle,
	dayLabel,
	MESSAGE_PAGE,
	personName,
} from "@/lib/chat";
import { useI18n } from "@/lib/i18n/provider";
import { orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { useRealtime, useTypingUsers } from "@/lib/realtime";
import { useTheme } from "@/lib/theme/provider";

const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🐾"];
const GROUP_WINDOW_MS = 5 * 60_000;
const CHAT_POSITION = {
	startRenderingFromBottom: true,
	autoscrollToBottomThreshold: 0.2,
} as const;

type Pages = InfiniteData<ChatMessage[], Date | undefined>;

export default function ConversationScreen() {
	const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
	const { t, locale } = useI18n();
	const { colors } = useTheme();
	const insets = useSafeAreaInsets();
	const { data: session } = useSession();
	const meId = session?.user?.id ?? "";
	const qc = useQueryClient();
	const { sendTyping } = useRealtime();
	const typers = useTypingUsers(conversationId);
	const sheet = useRef<BottomSheetModal>(null);
	const [selected, setSelected] = useState<ChatMessage | null>(null);
	const [editing, setEditing] = useState<ChatMessage | null>(null);

	const conversation = useQuery(
		orpc.message.conversationById.queryOptions({ input: { conversationId } }),
	);
	const participants = useQuery({
		...orpc.message.participants.queryOptions({ input: { conversationId } }),
		staleTime: 5 * 60_000,
	});

	const listOptions = orpc.message.list.infiniteOptions({
		// A restored cache brings page params back through JSON, so the first
		// page's `undefined` arrives as null (and dates as strings). null would
		// coerce to 1970 on the server and return nothing.
		input: (before: Date | string | null | undefined) => ({
			conversationId,
			limit: MESSAGE_PAGE,
			before: before ? new Date(before) : undefined,
		}),
		initialPageParam: undefined,
		getNextPageParam: (last) =>
			last.length === MESSAGE_PAGE ? new Date(last[0].createdAt) : undefined,
	});
	const messages = useInfiniteQuery(listOptions);

	const people = useMemo(() => {
		const map = new Map<string, { name: string; avatar: string | null }>();
		for (const p of participants.data ?? [])
			map.set(p.userId, { name: personName(p), avatar: p.avatarFileId });
		return map;
	}, [participants.data]);

	const others = useMemo(
		() => (participants.data ?? []).filter((p) => p.userId !== meId),
		[participants.data, meId],
	);
	// A direct chat's avatar opens the other person's profile.
	const directProfile =
		conversation.data?.type === "group" ? null : others[0]?.profileUrl;
	const openProfile = useCallback(() => {
		if (directProfile) router.push(`/user/${directProfile}`);
	}, [directProfile]);
	const title = conversation.data
		? conversationTitle(
				{ name: conversation.data.name, others },
				t("chat.conversationFallback"),
			)
		: "";

	// Oldest to newest. Pages arrive newest page first, each oldest to newest.
	const rows = useMemo<MessageRowData[]>(() => {
		const flat = [...(messages.data?.pages ?? [])].reverse().flat();
		const words = { today: t("chat.today"), yesterday: t("chat.yesterday") };
		return flat.map((m, i) => {
			const prev = flat[i - 1];
			const at = new Date(m.createdAt);
			const prevAt = prev ? new Date(prev.createdAt) : null;
			const newDay = !prevAt || prevAt.toDateString() !== at.toDateString();
			const sender = people.get(m.senderId);
			return {
				message: m,
				senderName: sender?.name || t("chat.userFallback"),
				senderAvatar: sender?.avatar ?? null,
				grouped:
					!newDay &&
					!!prev &&
					prev.senderId === m.senderId &&
					at.getTime() - (prevAt?.getTime() ?? 0) < GROUP_WINDOW_MS,
				day: newDay ? dayLabel(at, locale, words) : null,
				pending: m.id.startsWith("pending:"),
			};
		});
	}, [messages.data, people, locale, t]);

	const patchPages = useCallback(
		(fn: (pages: ChatMessage[][]) => ChatMessage[][]) =>
			qc.setQueryData<Pages>(listOptions.queryKey, (old) =>
				old ? { ...old, pages: fn(old.pages) } : old,
			),
		[qc, listOptions.queryKey],
	);
	const refresh = useCallback(() => {
		qc.invalidateQueries({ queryKey: listOptions.queryKey });
		qc.invalidateQueries({ queryKey: orpc.message.myConversations.key() });
	}, [qc, listOptions.queryKey]);

	const send = useMutation({
		mutationFn: (body: string) =>
			orpc.message.send.call({ conversationId, body }),
		onMutate: (body) => {
			const pending = {
				id: `pending:${Date.now()}`,
				conversationId,
				channelId: null,
				senderId: meId,
				body,
				messageType: "text",
				attachments: [],
				appwriteId: null,
				createdAt: new Date(),
				editedAt: null,
				reactions: [],
			} satisfies ChatMessage;
			patchPages((pages) =>
				pages.length
					? [[...pages[0], pending], ...pages.slice(1)]
					: [[pending]],
			);
		},
		onError: (e) => Alert.alert(t("chat.sendFailed"), humanizeError(e)),
		onSettled: refresh,
	});

	const edit = useMutation({
		mutationFn: (v: { messageId: string; body: string }) =>
			orpc.message.edit.call(v),
		onMutate: ({ messageId, body }) =>
			patchPages((pages) =>
				pages.map((p) =>
					p.map((m) =>
						m.id === messageId ? { ...m, body, editedAt: new Date() } : m,
					),
				),
			),
		onError: (e) => Alert.alert(t("common.error"), humanizeError(e)),
		onSettled: refresh,
	});

	const remove = useMutation({
		mutationFn: (messageId: string) => orpc.message.delete.call({ messageId }),
		onMutate: (messageId) =>
			patchPages((pages) =>
				pages.map((p) => p.filter((m) => m.id !== messageId)),
			),
		onError: (e) => Alert.alert(t("common.error"), humanizeError(e)),
		onSettled: refresh,
	});

	const react = useMutation({
		mutationFn: (v: { messageId: string; emoji: string }) =>
			orpc.message.react.call(v),
		onMutate: ({ messageId, emoji }) =>
			patchPages((pages) =>
				pages.map((p) =>
					p.map((m) => {
						if (m.id !== messageId) return m;
						const cur = m.reactions.find((r) => r.emoji === emoji);
						const reactions = cur
							? m.reactions
									.map((r) =>
										r.emoji === emoji
											? {
													...r,
													mine: !r.mine,
													count: r.count + (r.mine ? -1 : 1),
												}
											: r,
									)
									.filter((r) => r.count > 0)
							: [...m.reactions, { emoji, count: 1, mine: true }];
						return { ...m, reactions };
					}),
				),
			),
		onSettled: refresh,
	});

	const onReact = useCallback(
		(messageId: string, emoji: string) => react.mutate({ messageId, emoji }),
		[react.mutate],
	);
	const onLongPress = useCallback((m: ChatMessage) => {
		if (m.id.startsWith("pending:")) return;
		setSelected(m);
		sheet.current?.present();
	}, []);
	const onSend = useCallback(
		(body: string) => {
			if (editing) {
				edit.mutate({ messageId: editing.id, body });
				setEditing(null);
			} else send.mutate(body);
		},
		[editing, edit.mutate, send.mutate],
	);
	const onTyping = useCallback(
		() => sendTyping(conversationId),
		[sendTyping, conversationId],
	);
	const onCancelEdit = useCallback(() => setEditing(null), []);

	const typingText = useMemo(() => {
		if (!typers.length) return "";
		const names = typers.map((id) => people.get(id)?.name).filter(Boolean);
		if (!names.length) return t("chat.typingSomeone");
		if (names.length > 3)
			return t("chat.typingNPeople", { count: names.length });
		return names.length === 1
			? t("chat.typingOne", { names: names[0] })
			: t("chat.typingMany", { names: names.join(", ") });
	}, [typers, people, t]);

	const placeholder = t("chat.messageNamePlaceholder", {
		name: title || t("chat.conversationFallback"),
	});
	const editedLabel = t("chat.edited");

	const pick = (fn: (m: ChatMessage) => void) => {
		const m = selected;
		sheet.current?.dismiss();
		if (m) fn(m);
	};

	return (
		<KeyboardAvoidingView behavior="padding" className="bg-background flex-1">
			<Stack.Screen
				options={{
					title,
					headerTitleAlign: "center",
					headerRight: () =>
						conversation.data ? (
							<Pressable
								onPress={openProfile}
								disabled={!directProfile}
								accessibilityRole={directProfile ? "button" : undefined}
								accessibilityLabel={title}
								hitSlop={8}
							>
								<ConversationAvatar
									others={others}
									isGroup={conversation.data.type === "group"}
									title={title}
									size={36}
								/>
							</Pressable>
						) : null,
				}}
			/>
			{messages.isLoading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator color={colors.primary} />
				</View>
			) : messages.isError ? (
				<View className="flex-1 items-center justify-center">
					<EmptyState
						icon={MessagesSquare}
						title={t("common.couldntLoad")}
						subtitle={humanizeError(messages.error)}
						action={{
							label: t("common.retry"),
							onPress: () => messages.refetch(),
						}}
					/>
				</View>
			) : (
				<FlashList
					data={rows}
					keyExtractor={(r) => r.message.id}
					contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
					renderItem={({ item }) => (
						<MessageRow
							{...item}
							locale={locale}
							editedLabel={editedLabel}
							onReact={onReact}
							onLongPress={onLongPress}
						/>
					)}
					// Chat layout: start at the newest message, stay pinned to the bottom
					// as messages arrive, and load older pages when scrolling up.
					maintainVisibleContentPosition={CHAT_POSITION}
					onStartReachedThreshold={0.4}
					onStartReached={() => {
						if (messages.hasNextPage && !messages.isFetchingNextPage)
							messages.fetchNextPage();
					}}
					ListHeaderComponent={
						messages.isFetchingNextPage ? (
							<ActivityIndicator className="py-4" color={colors.primary} />
						) : null
					}
					ListEmptyComponent={
						<View className="items-center py-10">
							<Text className="text-muted-foreground font-semibold">
								{t("chat.noMessagesYet")}
							</Text>
						</View>
					}
					keyboardDismissMode="interactive"
					keyboardShouldPersistTaps="handled"
				/>
			)}
			<Text
				numberOfLines={1}
				className="text-muted-foreground h-5 px-5 text-xs font-semibold"
			>
				{typingText}
			</Text>
			{/* The keyboard view owns its own bottom padding, so the safe-area gap
			    lives on this wrapper or the box sits on the home indicator. */}
			<View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
				<Composer
					placeholder={placeholder}
					editing={editing ? editing.body : null}
					onSend={onSend}
					onCancelEdit={onCancelEdit}
					onTyping={onTyping}
				/>
			</View>

			<Sheet ref={sheet}>
				<View className="gap-3 pb-2">
					<View className="flex-row justify-between">
						{QUICK_REACTIONS.map((emoji) => (
							<Pressable
								key={emoji}
								onPress={() => pick((m) => onReact(m.id, emoji))}
								accessibilityRole="button"
								accessibilityLabel={`${t("chat.addReaction")} ${emoji}`}
								className="bg-muted active:opacity-70 h-12 w-12 items-center justify-center rounded-2xl"
							>
								<Text className="text-2xl">{emoji}</Text>
							</Pressable>
						))}
					</View>
					{selected?.senderId === meId && selected.messageType !== "gif" ? (
						<Pressable
							onPress={() => pick((m) => setEditing(m))}
							accessibilityRole="button"
							className="active:bg-muted flex-row items-center gap-3 rounded-2xl px-2 py-3.5"
						>
							<Icon as={Pencil} size={18} className="text-foreground" />
							<Text className="font-semibold">{t("chat.editMessage")}</Text>
						</Pressable>
					) : null}
					{selected?.senderId === meId ? (
						<Pressable
							onPress={() =>
								pick((m) =>
									Alert.alert(
										t("chat.deleteMessageConfirm"),
										t("chat.deleteMessageDescription"),
										[
											{ text: t("common.cancel"), style: "cancel" },
											{
												text: t("chat.deleteMessage"),
												style: "destructive",
												onPress: () => remove.mutate(m.id),
											},
										],
									),
								)
							}
							accessibilityRole="button"
							className="active:bg-muted flex-row items-center gap-3 rounded-2xl px-2 py-3.5"
						>
							<Icon as={Trash2} size={18} className="text-destructive" />
							<Text className="text-destructive font-semibold">
								{t("chat.deleteMessage")}
							</Text>
						</Pressable>
					) : null}
				</View>
			</Sheet>
		</KeyboardAvoidingView>
	);
}
