import { router } from "expo-router";
import { memo } from "react";
import { Pressable, View } from "react-native";
import { ConversationAvatar } from "@/components/chat/conversation-avatar";
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
	return (
		<Pressable
			onPress={() => router.push(`/chat/${c.id}`)}
			accessibilityRole="button"
			accessibilityLabel={title}
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
			{c.lastMessageAt ? (
				<Text className="text-muted-foreground text-xs font-semibold">
					{shortTime(c.lastMessageAt, locale)}
				</Text>
			) : null}
		</Pressable>
	);
});
