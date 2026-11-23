import { memo } from "react";
import { Pressable, View } from "react-native";
import { ChatMedia } from "@/components/chat/chat-media";
import { MessageAttachment } from "@/components/chat/message-attachment";
import { Avatar } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import { type ChatMessage, clockTime } from "@/lib/chat";

export type MessageRowData = {
	message: ChatMessage;
	senderName: string;
	senderAvatar: string | null;
	// Same sender within a few minutes of the previous message: no avatar/name.
	grouped: boolean;
	// Day separator label above this message, if it starts a new day.
	day: string | null;
	pending?: boolean;
};

type MessageRowProps = MessageRowData & {
	locale: string;
	editedLabel: string;
	reactorsHint: string;
	onReact: (messageId: string, emoji: string) => void;
	onLongPress: (message: ChatMessage) => void;
	/** Long-press on a reaction: who reacted with it. */
	onShowReactors: (messageId: string, emoji: string) => void;
};

const isGif = (m: ChatMessage) =>
	m.messageType === "gif" && /^https:\/\//.test(m.body);

// One chat line in the website's layout: avatar and name on the first message of
// a run, then plain lines underneath. Memoised so new messages only render the
// new rows.
export const MessageRow = memo(function MessageRow({
	message: m,
	senderName,
	senderAvatar,
	grouped,
	day,
	pending,
	locale,
	editedLabel,
	reactorsHint,
	onReact,
	onLongPress,
	onShowReactors,
}: MessageRowProps) {
	return (
		<View>
			{day ? (
				<View className="my-3 flex-row items-center gap-3 px-1">
					<View className="bg-border h-px flex-1" />
					<Text className="text-muted-foreground text-xs font-bold">{day}</Text>
					<View className="bg-border h-px flex-1" />
				</View>
			) : null}
			<Pressable
				onLongPress={() => onLongPress(m)}
				delayLongPress={300}
				className={`active:bg-muted/60 flex-row gap-3 rounded-2xl px-2 py-1 ${grouped ? "" : "mt-2"} ${pending ? "opacity-60" : ""}`}
			>
				<View style={{ width: 40 }}>
					{grouped ? null : (
						<Avatar
							fileId={senderAvatar}
							name={senderName}
							size={40}
							fallback="muted"
						/>
					)}
				</View>
				<View className="min-w-0 flex-1 gap-1">
					{grouped ? null : (
						<View className="flex-row items-baseline gap-2">
							<Text numberOfLines={1} className="shrink text-sm font-bold">
								{senderName}
							</Text>
							<Text className="text-muted-foreground text-xs">
								{clockTime(m.createdAt, locale)}
							</Text>
						</View>
					)}
					{isGif(m) ? (
						<ChatMedia
							uri={m.body}
							cacheId={m.id}
							onLongPress={() => onLongPress(m)}
						/>
					) : m.body ? (
						<Text selectable className="text-foreground leading-6">
							{m.body}
							{m.editedAt ? (
								<Text className="text-muted-foreground text-xs">
									{` ${editedLabel}`}
								</Text>
							) : null}
						</Text>
					) : null}
					{m.attachments.map((key) => (
						<MessageAttachment
							key={key}
							attachmentKey={key}
							onLongPress={() => onLongPress(m)}
							voice={m.messageType === "voice"}
						/>
					))}
					{m.reactions.length ? (
						<View className="flex-row flex-wrap gap-1.5 pt-0.5">
							{m.reactions.map((r) => (
								<Pressable
									key={r.emoji}
									onPress={() => onReact(m.id, r.emoji)}
									onLongPress={() => onShowReactors(m.id, r.emoji)}
									delayLongPress={300}
									accessibilityRole="button"
									accessibilityHint={reactorsHint}
									accessibilityState={{ selected: r.mine }}
									className={`flex-row items-center gap-1 rounded-full border px-2 py-0.5 ${r.mine ? "bg-primary/15 border-primary/40" : "bg-card border-border"}`}
								>
									<Text className="text-sm">{r.emoji}</Text>
									<Text
										className={`text-xs font-bold ${r.mine ? "text-link" : "text-muted-foreground"}`}
									>
										{r.count}
									</Text>
								</Pressable>
							))}
						</View>
					) : null}
				</View>
			</Pressable>
		</View>
	);
});
