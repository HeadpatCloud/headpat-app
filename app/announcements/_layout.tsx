import { Stack } from "expo-router";
import { useTheme } from "@/lib/theme/provider";

export default function AnnouncementsLayout() {
	const { colors } = useTheme();
	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: colors.background },
			}}
		>
			<Stack.Screen name="index" options={{ title: "Announcements" }} />
			<Stack.Screen name="[announcementId]" options={{ title: "" }} />
		</Stack>
	);
}
