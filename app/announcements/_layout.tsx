import { Stack } from "expo-router";
import { HeaderBack } from "@/components/header-back";
import { DETAIL_STACK_OPTIONS } from "@/components/header-controls";
import { useStackScreenOptions } from "@/lib/navigation/stack-options";

export default function AnnouncementsLayout() {
	const screenOptions = useStackScreenOptions(DETAIL_STACK_OPTIONS);
	return (
		<Stack screenOptions={screenOptions}>
			<Stack.Screen
				name="index"
				options={{
					title: "",
					headerLeft: () => <HeaderBack />,
				}}
			/>
			<Stack.Screen
				name="[announcementId]"
				options={{ title: "", headerLeft: () => <HeaderBack /> }}
			/>
		</Stack>
	);
}
