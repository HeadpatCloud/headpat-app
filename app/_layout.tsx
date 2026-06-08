import "@/global.css";

import { PortalHost } from "@rn-primitives/portal";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useSession } from "@/lib/auth-client";
import { AppProviders } from "@/lib/providers";
import { ThemeProvider } from "@/lib/theme/provider";

export {
	// Catch any errors thrown by the Layout component.
	ErrorBoundary,
} from "expo-router";

function useProtectedRoute() {
	const { data, isPending } = useSession();
	const segments = useSegments();
	const router = useRouter();

	useEffect(() => {
		if (isPending) return;
		const inAuthGroup = segments[0] === "(auth)";
		if (!data && !inAuthGroup) router.replace("/(auth)/welcome");
		else if (data && inAuthGroup) router.replace("/(tabs)");
	}, [data, isPending, segments, router]);
}

function RootNav() {
	useProtectedRoute();
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="(auth)" />
			<Stack.Screen name="(tabs)" />
			<Stack.Screen
				name="appearance"
				options={{ headerShown: true, title: "Appearance" }}
			/>
			<Stack.Screen
				name="theme-builder"
				options={{
					headerShown: true,
					title: "Theme builder",
					presentation: "modal",
				}}
			/>
			<Stack.Screen
				name="security"
				options={{ headerShown: true, title: "Security" }}
			/>
			<Stack.Screen
				name="connections"
				options={{ headerShown: true, title: "Connections" }}
			/>
		</Stack>
	);
}

export default function RootLayout() {
	return (
		<SafeAreaProvider>
			<AppProviders>
				<ThemeProvider>
					<RootNav />
					<PortalHost />
				</ThemeProvider>
			</AppProviders>
		</SafeAreaProvider>
	);
}
