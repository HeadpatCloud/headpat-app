import "@/global.css";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PortalHost } from "@rn-primitives/portal";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useSession } from "@/lib/auth-client";
import { I18nProvider, useI18n } from "@/lib/i18n/provider";
import { MotionProvider, useReducedMotion } from "@/lib/motion/reduced-motion";
import { AppProviders } from "@/lib/providers";
import { ThemeProvider, useTheme } from "@/lib/theme/provider";

export {
	// Catch any errors thrown by the Layout component.
	ErrorBoundary,
} from "expo-router";

// Hold the splash until ThemeProvider has hydrated the stored theme — the
// first visible frame is then already in the user's colors, not the default.
SplashScreen.preventAutoHideAsync().catch(() => {});

function useProtectedRoute() {
	const { data, isPending } = useSession();
	const segments = useSegments();
	const router = useRouter();
	const [onboarded, setOnboarded] = useState<boolean | null>(null);

	// Re-read on each navigation so finishing onboarding takes effect and a guest
	// is never bounced back into onboarding once the flag is set.
	// biome-ignore lint/correctness/useExhaustiveDependencies: segments is the re-read trigger
	useEffect(() => {
		AsyncStorage.getItem("hp-onboarded").then((v) => setOnboarded(v === "1"));
	}, [segments]);

	useEffect(() => {
		if (isPending || onboarded === null) return;
		const inAuthGroup = segments[0] === "(auth)";
		if (!data && !onboarded && !inAuthGroup) {
			router.replace("/(auth)/onboarding");
		} else if (data && inAuthGroup) {
			router.replace("/(tabs)");
		}
		// Onboarded but signed-out users roam freely (guest browsing): the (auth)
		// screens to sign in, or the (tabs) to browse public content.
	}, [data, isPending, segments, router, onboarded]);
}

function RootNav() {
	useProtectedRoute();
	const reduced = useReducedMotion();
	const { colors } = useTheme();
	const { t } = useI18n();
	return (
		<Stack
			screenOptions={{
				headerShown: false,
				animation: reduced ? "fade" : "slide_from_right",
				animationDuration: reduced ? 120 : undefined,
				gestureEnabled: true,
				// Paint the native screen container — the nav theme only colors the
				// JS view, so transitions otherwise flash the white window behind.
				contentStyle: { backgroundColor: colors.background },
			}}
		>
			<Stack.Screen name="(auth)" />
			<Stack.Screen name="(tabs)" />
			<Stack.Screen
				name="appearance"
				// the screen renders its own hero title (spec §12)
				options={{ headerShown: true, title: "" }}
			/>
			<Stack.Screen
				name="theme-builder"
				options={{
					headerShown: true,
					title: t("titles.themeBuilder"),
					presentation: "modal",
					animation: "default",
				}}
			/>
			<Stack.Screen
				name="security"
				options={{ headerShown: true, title: t("titles.security") }}
			/>
			<Stack.Screen
				name="connections"
				options={{ headerShown: true, title: t("titles.connections") }}
			/>
			<Stack.Screen name="announcements" />
			<Stack.Screen
				name="changelog"
				options={{ headerShown: true, title: "" }}
			/>
			<Stack.Screen
				name="notifications"
				options={{ headerShown: true, title: "" }}
			/>
			<Stack.Screen
				name="users/index"
				options={{ headerShown: true, title: t("titles.users") }}
			/>
			<Stack.Screen name="user" />
			<Stack.Screen
				name="profile-edit"
				options={{
					headerShown: true,
					title: t("titles.profileEdit"),
					presentation: "modal",
					animation: "default",
				}}
			/>
			<Stack.Screen name="tickets" />
			<Stack.Screen
				name="community-admin/[communityId]"
				options={{ headerShown: true, title: t("titles.communityAdmin") }}
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
						<I18nProvider>
							<MotionProvider>
								<BottomSheetModalProvider>
									<RootNav />
									<PortalHost />
								</BottomSheetModalProvider>
							</MotionProvider>
						</I18nProvider>
					</ThemeProvider>
				</AppProviders>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
