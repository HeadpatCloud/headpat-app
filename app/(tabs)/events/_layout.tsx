import { Stack } from "expo-router";
import { useTheme } from "@/lib/theme/provider";

export default function EventsLayout() {
	const { colors } = useTheme();
	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: colors.background },
			}}
		>
			<Stack.Screen name="index" options={{ title: "Events" }} />
			<Stack.Screen name="new" options={{ title: "New event" }} />
			<Stack.Screen name="[eventId]" options={{ title: "" }} />
		</Stack>
	);
}
