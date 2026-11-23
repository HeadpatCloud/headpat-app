import { router } from "expo-router";
import { memo } from "react";
import { Pressable, View } from "react-native";
import { ConversationAvatar } from "@/components/chat/conversation-avatar";
import { CountBadge } from "@/components/count-badge";
import { Text } from "@/components/ui/text";
import { type Conversation, conversationTitle, shortTime } from "@/lib/chat";
import { useI18n } from "@/lib/i18n/provider";

type Props = { conversation: Conversation };

// A conversation in the list: avatar (two stacked for groups), name and time.
export const ConversationRow = memo(function ConversationRow({
	conversation: c,
}: Props) {
	const { t, locale } = useI18n();
	const title = conversationTitle(c, t("chat.conversationFallback"));
	const [first] = c.others;
	const isGroup = c.type === "group";
	const unread = c.unreadCount ?? 0;
	return (
		<Pressable
			onPress={() => router.push(`/chat/${c.id}`)}
			accessibilityRole="button"
			accessibilityLabel={
				unread > 0 ? t("chat.unreadA11y", { title, count: unread }) : title
			}
			className="active:bg-muted flex-row items-center gap-3 rounded-2xl p-2"
		>
			<ConversationAvatar
				others={c.others}
				isGroup={c.type === "group"}
				title={title}
				size={48}
			/>
			<View className="min-w-0 flex-1">
				<Text numberOfLines={1} className="font-extrabold">
					{title}
				</Text>
				<Text
					numberOfLines={1}
					className="text-muted-foreground text-sm font-semibold"
				>
					{isGroup
						? t("chat.groupMembers", { count: c.others.length + 1 })
						: `@${first?.profileUrl ?? ""}`}
				</Text>
			</View>
			<View className="items-end gap-1">
				{c.lastMessageAt ? (
					<Text
						className={
							unread > 0
								? "text-link text-xs font-extrabold"
								: "text-muted-foreground text-xs font-semibold"
						}
					>
						{shortTime(c.lastMessageAt, locale)}
					</Text>
				) : null}
				<CountBadge count={unread} />
			</View>
		</Pressable>
	);
});
