import "@/global.css";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { PortalHost } from "@rn-primitives/portal";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useSession } from "@/lib/auth-client";
import { MotionProvider, useReducedMotion } from "@/lib/motion/reduced-motion";
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
	const reduced = useReducedMotion();
	return (
		<Stack
			screenOptions={{
				headerShown: false,
				animation: reduced ? "fade" : "slide_from_right",
				animationDuration: reduced ? 120 : undefined,
				gestureEnabled: true,
			}}
		>
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
					animation: "default",
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
			<Stack.Screen name="announcements" />
			<Stack.Screen
				name="changelog"
				options={{ headerShown: true, title: "What's new" }}
			/>
			<Stack.Screen
				name="users"
				options={{ headerShown: true, title: "Discover people" }}
			/>
			<Stack.Screen name="user" />
			<Stack.Screen
				name="profile-edit"
				options={{
					headerShown: true,
					title: "Edit profile",
					presentation: "modal",
					animation: "default",
				}}
			/>
			<Stack.Screen name="tickets" />
			<Stack.Screen
				name="community-admin/[communityId]"
				options={{ headerShown: true, title: "Manage community" }}
			/>
		</Stack>
	);
}

export default function RootLayout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<AppProviders>
					<ThemeProvider>
						<MotionProvider>
							<BottomSheetModalProvider>
								<RootNav />
								<PortalHost />
							</BottomSheetModalProvider>
						</MotionProvider>
					</ThemeProvider>
				</AppProviders>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
