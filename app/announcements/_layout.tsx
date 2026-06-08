import { Stack } from "expo-router";

export default function AnnouncementsLayout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ title: "Announcements" }} />
			<Stack.Screen name="[announcementId]" options={{ title: "" }} />
		</Stack>
	);
}
