import { Stack } from "expo-router";

export default function UserLayout() {
	return (
		<Stack>
			<Stack.Screen name="[profileUrl]/index" options={{ title: "" }} />
			<Stack.Screen
				name="[profileUrl]/followers"
				options={{ title: "Followers" }}
			/>
			<Stack.Screen
				name="[profileUrl]/following"
				options={{ title: "Following" }}
			/>
		</Stack>
	);
}
