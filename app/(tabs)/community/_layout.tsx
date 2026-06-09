import { Stack } from "expo-router";

export default function CommunityLayout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ title: "Communities" }} />
			<Stack.Screen name="[communityId]" options={{ title: "" }} />
			<Stack.Screen
				name="new"
				options={{ title: "New community", presentation: "modal" }}
			/>
		</Stack>
	);
}
