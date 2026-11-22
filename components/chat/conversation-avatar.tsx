import { memo } from "react";
import { View } from "react-native";
import { Avatar } from "@/components/ui/avatar";
import type { Person } from "@/lib/chat";

type Props = {
	others: Pick<Person, "avatarFileId" | "displayName">[];
	isGroup: boolean;
	title: string;
	size: number;
};

// One avatar for a direct chat, two overlapping ones for a group. Shared by the
// conversation list and the conversation header.
export const ConversationAvatar = memo(function ConversationAvatar({
	others,
	isGroup,
	title,
	size,
}: Props) {
	const [first, second] = others;
	return (
		<View style={{ width: size, height: size }}>
			{isGroup && second ? (
				<>
					<Avatar
						fileId={first?.avatarFileId}
						name={first?.displayName}
						size={Math.round(size * 0.7)}
						fallback="muted"
					/>
					<View className="border-background absolute bottom-0 right-0 rounded-full border-2">
						<Avatar
							fileId={second.avatarFileId}
							name={second.displayName}
							size={Math.round(size * 0.62)}
							fallback="muted"
						/>
					</View>
				</>
			) : (
				<Avatar
					fileId={first?.avatarFileId}
					name={first?.displayName ?? title}
					size={size}
					fallback="muted"
				/>
			)}
		</View>
	);
});
