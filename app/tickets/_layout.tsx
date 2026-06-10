import { Stack } from "expo-router";
import { useTheme } from "@/lib/theme/provider";

export default function TicketsLayout() {
	const { colors } = useTheme();
	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: colors.background },
			}}
		>
			<Stack.Screen name="index" options={{ title: "Support" }} />
			<Stack.Screen name="new" options={{ title: "New ticket" }} />
			<Stack.Screen name="[ticketId]" options={{ title: "Ticket" }} />
		</Stack>
	);
}
