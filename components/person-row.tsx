import { memo, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Avatar } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import { personName } from "@/lib/chat";

export type PersonSummary = {
	userId: string;
	profileUrl: string;
	displayName: string | null;
	name?: string | null;
	avatarFileId: string | null;
};

type Props = {
	person: PersonSummary;
	onPress: (person: PersonSummary) => void;
	trailing?: ReactNode;
};

// Avatar, name and @handle, like the website's "Say hi to" list.
export const PersonRow = memo(function PersonRow({
	person,
	onPress,
	trailing,
}: Props) {
	const name = personName(person);
	return (
		<Pressable
			onPress={() => onPress(person)}
			accessibilityRole="button"
			accessibilityLabel={name}
			className="active:bg-muted flex-row items-center gap-3 rounded-2xl p-2"
		>
			<Avatar
				fileId={person.avatarFileId}
				name={name}
				size={44}
				fallback="muted"
			/>
			<View className="min-w-0 flex-1">
				<Text numberOfLines={1} className="font-extrabold">
					{name}
				</Text>
				<Text
					numberOfLines={1}
					className="text-muted-foreground text-sm font-semibold"
				>
					@{person.profileUrl}
				</Text>
			</View>
			{trailing}
		</Pressable>
	);
});
