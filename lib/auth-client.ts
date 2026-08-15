import { expoClient } from "@better-auth/expo/client";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
// Force expo-network into the main bundle: @better-auth/expo lazy-imports it
// inside useSession's first render, and Metro's lazy split turns that into a
// sync require that the dev runtime reports as a fatal "unknown module" error
import "expo-network";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { env } from "@/lib/env";

const isWeb = Platform.OS === "web";

// SecureStore.getItem is synchronous, and on Android it decrypts through the
// keystore over binder IPC (~1-4ms a call). better-auth reads the session cookie
// in the headers callback of every request, so a screen mounting N queries block
// the JS thread N times mid-transition. This plugin is the only writer of these
// keys and its adapter only ever calls getItem/setItem, so a write-through cache
// cannot go stale.
const secureStoreCache = new Map<string, string | null>();

const cachedSecureStore = {
	getItem: (key: string) => {
		if (secureStoreCache.has(key)) return secureStoreCache.get(key) ?? null;
		const value = SecureStore.getItem(key);
		secureStoreCache.set(key, value);
		return value;
	},
	setItem: async (key: string, value: string) => {
		secureStoreCache.set(key, value);
		await SecureStore.setItemAsync(key, value);
	},
};

export const authClient = createAuthClient({
	baseURL: env.apiUrl,
	fetchOptions: isWeb ? { credentials: "include" } : undefined,
	plugins: [
		...(isWeb
			? []
			: [
					expoClient({
						scheme: "headpat",
						storagePrefix: "headpat",
						storage: cachedSecureStore,
					}),
				]),
		twoFactorClient({
			onTwoFactorRedirect() {
				router.push("/(auth)/mfa");
			},
		}),
	],
});

export const { signIn, signUp, signOut, useSession, twoFactor } = authClient;
