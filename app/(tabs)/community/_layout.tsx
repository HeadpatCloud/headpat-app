import { Stack } from "expo-router";
import { useTheme } from "@/lib/theme/provider";

export default function CommunityLayout() {
	const { colors } = useTheme();
	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: colors.background },
			}}
		>
			<Stack.Screen name="index" options={{ title: "Communities" }} />
			<Stack.Screen name="[communityId]" options={{ title: "" }} />
			<Stack.Screen
				name="new"
				options={{ title: "New community", presentation: "modal" }}
			/>
		</Stack>
	);
}
