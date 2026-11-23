import { router } from "expo-router";
import { Fragment, useMemo } from "react";
import { Pressable, View } from "react-native";
import { Avatar } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import { mentionHandles, parseMentions } from "@/lib/mentions";
import { type MentionUser, useMentionUsers } from "@/lib/use-mention-users";

/** A mentioned user drawn inline: small avatar and display name, opening
 *  their profile. Meant to sit inside a <Text>. */
export function MentionChip({ user }: { user: MentionUser }) {
	const label = user.displayName || user.name || user.profileUrl;
	return (
		// Inline views sit on the text baseline; nudge the pill down to line up
		// with the words around it.
		<View style={{ transform: [{ translateY: 3 }] }}>
			<Pressable
				onPress={() => router.push(`/user/${user.profileUrl}`)}
				accessibilityRole="link"
				accessibilityLabel={label}
				hitSlop={4}
				className="bg-primary/15 active:bg-primary/25 max-w-full flex-row items-center gap-1 rounded-full py-px pr-2 pl-px"
			>
				<Avatar
					fileId={user.avatarFileId}
					name={label}
					size={18}
					fallback="muted"
				/>
				<Text
					numberOfLines={1}
					className="text-link shrink text-sm font-semibold"
				>
					{label}
				</Text>
			</Pressable>
		</View>
	);
}

/** Renders `text` with @name mentions and profile links swapped for user
 *  chips. Unknown or hidden users stay as typed. Returns inline content, so
 *  place it inside a <Text>. */
export function UserText({ text }: { text: string | null | undefined }) {
	const parts = useMemo(() => parseMentions(text ?? ""), [text]);
	const handles = useMemo(() => mentionHandles(parts), [parts]);
	const users = useMentionUsers(handles);
	if (handles.length === 0) return <>{text}</>;
	return (
		<>
			{parts.map((part, i) => {
				const user = part.kind === "mention" ? users.get(part.handle) : null;
				return user ? (
					<MentionChip key={i} user={user} />
				) : (
					<Fragment key={i}>{part.text}</Fragment>
				);
			})}
		</>
	);
}
