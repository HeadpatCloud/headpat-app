import { Stack } from "expo-router";
import { useTheme } from "@/lib/theme/provider";

export default function UserLayout() {
	const { colors } = useTheme();
	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: colors.background },
			}}
		>
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
