import { Stack } from "expo-router";

export default function AuthLayout() {
	return (
		<Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
			<Stack.Screen name="onboarding" options={{ animation: "fade" }} />
			<Stack.Screen name="welcome" options={{ animation: "fade" }} />
		</Stack>
	);
}
