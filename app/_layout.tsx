import "@/global.css";
import "@/lib/location/background-task";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { PortalHost } from "@rn-primitives/portal";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AgeGate } from "@/components/age-gate";
import { EulaGate } from "@/components/eula-gate";
import { OfflineBadge } from "@/components/offline-badge";
import { useSession } from "@/lib/auth-client";
import { kvGet, useKvReady } from "@/lib/db/kv";
import { I18nProvider, useI18n } from "@/lib/i18n/provider";
import { MotionProvider, useReducedMotion } from "@/lib/motion/reduced-motion";
import { AppProviders } from "@/lib/providers";
import { ThemeProvider, useTheme } from "@/lib/theme/provider";
import { useAgeGate } from "@/lib/use-age-gate";
import { useEula } from "@/lib/use-eula";
import { usePushNotifications } from "@/lib/use-push-notifications";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync().catch(() => {});

function useProtectedRoute() {
	const { data, isPending } = useSession();
	const segments = useSegments();
	const router = useRouter();
	// Navigating is how this learns onboarding finished: finishOnboarding writes
	// the key, then replaces the route. The read is synchronous now, so this is a
	// cheap re-check rather than an AsyncStorage round trip plus a root re-render.
	// biome-ignore lint/correctness/useExhaustiveDependencies: segments is the re-check trigger, not a value read here
	const onboarded = useMemo(() => kvGet("hp-onboarded") === "1", [segments]);

	useEffect(() => {
		if (isPending) return;
		const inAuthGroup = segments[0] === "(auth)";
		if (!data && !onboarded && !inAuthGroup) {
			router.replace("/(auth)/onboarding");
		} else if (data && inAuthGroup) {
			router.replace("/");
		}
	}, [data, isPending, segments, router, onboarded]);
}

function RootNav() {
	useProtectedRoute();
	usePushNotifications();
	const reduced = useReducedMotion();
	const { colors } = useTheme();
	const { t } = useI18n();
	const segments = useSegments();
	const { needsAcceptance, serverUpdatedAt, accept } = useEula();
	const { needsAgeCheck, clear: clearAge } = useAgeGate();
	const showEulaGate = needsAcceptance && segments[0] !== "(auth)";
	return (
		<>
			<Stack
				screenOptions={{
					headerShown: false,
					animation: reduced ? "fade" : "slide_from_right",
					animationDuration: reduced ? 120 : undefined,
					gestureEnabled: true,
					headerBackButtonDisplayMode: "minimal",
					contentStyle: { backgroundColor: colors.background },
				}}
			>
				<Stack.Screen name="(auth)" />
				<Stack.Screen name="(tabs)" />
				<Stack.Screen
					name="appearance"
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
				<Stack.Screen
					name="storage"
					options={{ headerShown: true, title: t("titles.storage") }}
				/>
				<Stack.Screen name="announcements" />
				<Stack.Screen name="community" />
				<Stack.Screen name="event" />
				<Stack.Screen name="post" />
				<Stack.Screen
					name="changelog"
					options={{ headerShown: true, title: "" }}
				/>
				<Stack.Screen name="legal" options={{ headerShown: true, title: "" }} />
				<Stack.Screen
					name="support"
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
				<Stack.Screen name="profile" />
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
				<Stack.Screen name="admin" />
				<Stack.Screen
					name="community-admin/[communityId]"
					options={{ headerShown: true, title: t("titles.communityAdmin") }}
				/>
			</Stack>
			{showEulaGate ? (
				<EulaGate updatedAt={serverUpdatedAt} onAccept={accept} />
			) : null}
			{needsAgeCheck ? <AgeGate onClear={clearAge} /> : null}
		</>
	);
}

export default function RootLayout() {
	// Gates the whole tree: providers read preferences synchronously on their first
	// render, so nothing may mount before the one-time migration has run. The
	// splash is still up, and this is instant on every launch after the first.
	const kvReady = useKvReady();
	if (!kvReady) return null;

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<KeyboardProvider>
				<SafeAreaProvider>
					<AppProviders>
						<ThemeProvider>
							<I18nProvider>
								<MotionProvider>
									<BottomSheetModalProvider>
										<RootNav />
										<OfflineBadge />
										<PortalHost />
									</BottomSheetModalProvider>
								</MotionProvider>
							</I18nProvider>
						</ThemeProvider>
					</AppProviders>
				</SafeAreaProvider>
			</KeyboardProvider>
		</GestureHandlerRootView>
	);
}
