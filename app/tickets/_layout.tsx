import { Stack } from "expo-router";

export default function TicketsLayout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ title: "Support" }} />
			<Stack.Screen name="new" options={{ title: "New ticket" }} />
			<Stack.Screen name="[ticketId]" options={{ title: "Ticket" }} />
		</Stack>
	);
}
