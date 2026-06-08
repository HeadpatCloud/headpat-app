import { Stack } from "expo-router";

export default function CommunityLayout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ title: "Communities" }} />
			<Stack.Screen name="[communityId]" options={{ title: "" }} />
		</Stack>
	);
}
