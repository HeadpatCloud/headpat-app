import { Stack } from "expo-router";
import { useTheme } from "@/lib/theme/provider";

export default function AuthLayout() {
	const { colors } = useTheme();
	return (
		<Stack
			screenOptions={{
				headerShown: false,
				animation: "slide_from_right",
				contentStyle: { backgroundColor: colors.background },
			}}
		>
			<Stack.Screen name="onboarding" options={{ animation: "fade" }} />
			<Stack.Screen name="welcome" options={{ animation: "fade" }} />
		</Stack>
	);
}
