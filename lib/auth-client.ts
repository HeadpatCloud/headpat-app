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
						storage: SecureStore,
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
