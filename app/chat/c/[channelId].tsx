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
import { EmojiPickerSheet } from "@/components/chat/emoji-picker-sheet";
import { MessageRow, type MessageRowData } from "@/components/chat/message-row";
import { ReactorsSheet } from "@/components/chat/reactors-sheet";
import { ServerTile } from "@/components/chat/server-tile";
import type { VoiceTake } from "@/components/chat/voice-recorder-bar";
import { EmptyState } from "@/components/empty-state";
import { Hash, Pencil, SmilePlus, Trash2, Users } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import {
	type ChannelMessage,
	dayLabel,
	MESSAGE_PAGE,
	personName,
} from "@/lib/chat";
import { useI18n } from "@/lib/i18n/provider";
import { orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { channelTypingKey, useRealtime, useTypingUsers } from "@/lib/realtime";
import { useTheme } from "@/lib/theme/provider";
import { uploadVoiceNote } from "@/lib/upload";

const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🐾"];
const GROUP_WINDOW_MS = 5 * 60_000;
const STAFF = new Set(["owner", "admin", "moderator"]);
const CHAT_POSITION = {
	startRenderingFromBottom: true,
	autoscrollToBottomThreshold: 0.2,
} as const;

type Pages = InfiniteData<ChannelMessage[], Date | undefined>;

// A community channel: the same thread as a direct chat, with each message's
// author coming along with it and staff able to remove anyone's messages.
export default function ChannelScreen() {
	const { channelId } = useLocalSearchParams<{ channelId: string }>();
	const { t, locale } = useI18n();
	const { colors } = useTheme();
	const insets = useSafeAreaInsets();
	const { data: session } = useSession();
	const meId = session?.user?.id ?? "";
	const qc = useQueryClient();
	const { sendChannelTyping } = useRealtime();
	const typers = useTypingUsers(channelTypingKey(channelId));
	const sheet = useRef<BottomSheetModal>(null);
	const emojiSheet = useRef<BottomSheetModal>(null);
	const reactorsSheet = useRef<BottomSheetModal>(null);
	const [selected, setSelected] = useState<ChannelMessage | null>(null);
	const [reactors, setReactors] = useState<{
		messageId: string;
		emoji: string | null;
	} | null>(null);
	const [editing, setEditing] = useState<ChannelMessage | null>(null);

	const channel = useQuery(
		orpc.channel.byId.queryOptions({ input: { channelId } }),
	);
	const communityId = channel.data?.communityId ?? "";
	const role = useQuery({
		...orpc.community.myRoleIn.queryOptions({ input: { communityId } }),
		enabled: !!communityId,
		staleTime: 5 * 60_000,
	});
	const staff = STAFF.has(role.data?.role ?? "");
	// The rail's cached server list has the community's name and avatar.
	const server = useQuery({
		...orpc.sidebarLayout.get.queryOptions({ input: undefined }),
		select: (d) => d.servers.find((s) => s.id === communityId),
	}).data;

	const listOptions = orpc.channel.messages.infiniteOptions({
		// A restored cache brings page params back through JSON, so the first
		// page's `undefined` arrives as null (and dates as strings).
		input: (before: Date | string | null | undefined) => ({
			channelId,
			limit: MESSAGE_PAGE,
			before: before ? new Date(before) : undefined,
		}),
		initialPageParam: undefined,
		getNextPageParam: (last) =>
			last.length === MESSAGE_PAGE ? new Date(last[0].createdAt) : undefined,
	});
	const messages = useInfiniteQuery(listOptions);

	// Names for the typing line, from the authors seen in the thread so far.
	const people = useMemo(() => {
		const map = new Map<string, string>();
		for (const page of messages.data?.pages ?? [])
			for (const m of page)
				if (m.author) map.set(m.senderId, personName(m.author));
		return map;
	}, [messages.data]);

	const title = channel.data ? `#${channel.data.name}` : "";

	// Oldest to newest. Pages arrive newest page first, each oldest to newest.
	const rows = useMemo<MessageRowData[]>(() => {
		const flat = [...(messages.data?.pages ?? [])].reverse().flat();
		const words = { today: t("chat.today"), yesterday: t("chat.yesterday") };
		return flat.map((m, i) => {
			const prev = flat[i - 1];
			const at = new Date(m.createdAt);
			const prevAt = prev ? new Date(prev.createdAt) : null;
			const newDay = !prevAt || prevAt.toDateString() !== at.toDateString();
			return {
				message: m,
				senderName:
					(m.author && personName(m.author)) || t("chat.userFallback"),
				senderAvatar: m.author?.avatarFileId ?? null,
				grouped:
					!newDay &&
					!!prev &&
					prev.senderId === m.senderId &&
					at.getTime() - (prevAt?.getTime() ?? 0) < GROUP_WINDOW_MS,
				day: newDay ? dayLabel(at, locale, words) : null,
				pending: m.id.startsWith("pending:"),
			};
		});
	}, [messages.data, locale, t]);

	const patchPages = useCallback(
		(fn: (pages: ChannelMessage[][]) => ChannelMessage[][]) =>
			qc.setQueryData<Pages>(listOptions.queryKey, (old) =>
				old ? { ...old, pages: fn(old.pages) } : old,
			),
		[qc, listOptions.queryKey],
	);
	const refresh = useCallback(
		() => qc.invalidateQueries({ queryKey: listOptions.queryKey }),
		[qc, listOptions.queryKey],
	);

	// My own author entry for the pending bubble, from any message I sent.
	const me = useMemo(() => {
		for (const page of messages.data?.pages ?? [])
			for (const m of page)
				if (m.senderId === meId && m.author) return m.author;
		return null;
	}, [messages.data, meId]);

	const send = useMutation({
		mutationFn: (body: string) => orpc.channel.send.call({ channelId, body }),
		onMutate: (body) => {
			const pending = {
				id: `pending:${Date.now()}`,
				conversationId: null,
				channelId,
				senderId: meId,
				body,
				messageType: "text",
				attachments: [],
				appwriteId: null,
				createdAt: new Date(),
				editedAt: null,
				reactions: [],
				author: me ?? {
					userId: meId,
					profileUrl: null,
					displayName: null,
					name: session?.user?.name ?? null,
					avatarFileId: null,
				},
			} satisfies ChannelMessage;
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
	const onLongPress = useCallback(
		(m: MessageRowData["message"]) => {
			if (m.id.startsWith("pending:")) return;
			const found = messages.data?.pages.flat().find((x) => x.id === m.id);
			if (!found) return;
			setSelected(found);
			sheet.current?.present();
		},
		[messages.data],
	);
	const onSend = useCallback(
		(body: string) => {
			if (editing) {
				edit.mutate({ messageId: editing.id, body });
				setEditing(null);
			} else send.mutate(body);
		},
		[editing, edit.mutate, send.mutate],
	);
	const onSendVoice = useCallback(
		async (take: VoiceTake) => {
			const key = await uploadVoiceNote(channelId, take.uri);
			await orpc.channel.send.call({
				channelId,
				messageType: "voice",
				attachments: [key],
			});
			refresh();
		},
		[channelId, refresh],
	);
	const onShowReactors = useCallback(
		(messageId: string, emoji: string | null) => {
			setReactors({ messageId, emoji });
			reactorsSheet.current?.present();
		},
		[],
	);
	const onPickEmoji = useCallback(
		(emoji: string) => {
			const m = selected;
			emojiSheet.current?.dismiss();
			if (m) onReact(m.id, emoji);
		},
		[selected, onReact],
	);
	const onTyping = useCallback(
		() => sendChannelTyping(channelId),
		[sendChannelTyping, channelId],
	);
	const onCancelEdit = useCallback(() => setEditing(null), []);

	const typingText = useMemo(() => {
		if (!typers.length) return "";
		const names = typers.map((id) => people.get(id)).filter(Boolean);
		if (!names.length) return t("chat.typingSomeone");
		if (names.length > 3)
			return t("chat.typingNPeople", { count: names.length });
		return names.length === 1
			? t("chat.typingOne", { names: names[0] })
			: t("chat.typingMany", { names: names.join(", ") });
	}, [typers, people, t]);

	const placeholder = t("chat.messageChannelPlaceholder", {
		channel: channel.data?.name ?? t("chat.channelFallback"),
	});
	const editedLabel = t("chat.edited");
	const reactorsHint = t("chat.reactorsHint");
	const mine = selected?.senderId === meId;

	const pick = (fn: (m: ChannelMessage) => void) => {
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
						communityId ? (
							<Pressable
								onPress={() => router.push(`/community/${communityId}`)}
								accessibilityRole="link"
								accessibilityLabel={server?.name ?? t("chat.viewCommunity")}
								hitSlop={8}
							>
								<ServerTile server={server} size={36} radius={10} />
							</Pressable>
						) : null,
				}}
			/>
			{channel.data?.topic ? (
				<Text
					numberOfLines={2}
					className="text-muted-foreground border-border border-b px-5 pb-2 text-center text-sm font-semibold"
				>
					{channel.data.topic}
				</Text>
			) : null}
			{messages.isLoading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator color={colors.primary} />
				</View>
			) : messages.isError ? (
				<View className="flex-1 items-center justify-center">
					<EmptyState
						icon={Hash}
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
							reactorsHint={reactorsHint}
							onReact={onReact}
							onLongPress={onLongPress}
							onShowReactors={onShowReactors}
						/>
					)}
					// Start at the newest message, stay pinned to the bottom as
					// messages arrive, and load older pages when scrolling up.
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
					onSendVoice={onSendVoice}
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
								className="bg-muted active:opacity-70 h-11 w-11 items-center justify-center rounded-2xl"
							>
								<Text className="text-2xl">{emoji}</Text>
							</Pressable>
						))}
						<Pressable
							onPress={() => {
								// Keep the message selected for the picker.
								sheet.current?.dismiss();
								emojiSheet.current?.present();
							}}
							accessibilityRole="button"
							accessibilityLabel={t("chat.moreEmoji")}
							className="bg-muted active:opacity-70 h-11 w-11 items-center justify-center rounded-2xl"
						>
							<Icon as={SmilePlus} size={22} className="text-foreground" />
						</Pressable>
					</View>
					{selected?.reactions.length ? (
						<Pressable
							onPress={() => pick((m) => onShowReactors(m.id, null))}
							accessibilityRole="button"
							className="active:bg-muted flex-row items-center gap-3 rounded-2xl px-2 py-3.5"
						>
							<Icon as={Users} size={18} className="text-foreground" />
							<Text className="font-semibold">{t("chat.reactionsTitle")}</Text>
						</Pressable>
					) : null}
					{mine &&
					selected?.messageType !== "gif" &&
					selected?.messageType !== "voice" ? (
						<Pressable
							onPress={() => pick((m) => setEditing(m))}
							accessibilityRole="button"
							className="active:bg-muted flex-row items-center gap-3 rounded-2xl px-2 py-3.5"
						>
							<Icon as={Pencil} size={18} className="text-foreground" />
							<Text className="font-semibold">{t("chat.editMessage")}</Text>
						</Pressable>
					) : null}
					{mine || staff ? (
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
			<EmojiPickerSheet ref={emojiSheet} onSelect={onPickEmoji} />
			<ReactorsSheet
				ref={reactorsSheet}
				messageId={reactors?.messageId ?? null}
				emoji={reactors?.emoji ?? null}
				onOpenProfile={() => reactorsSheet.current?.dismiss()}
			/>
		</KeyboardAvoidingView>
	);
}
