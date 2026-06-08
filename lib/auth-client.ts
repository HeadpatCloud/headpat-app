import { expoClient } from "@better-auth/expo/client";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { env } from "@/lib/env";

const isWeb = Platform.OS === "web";

export const authClient = createAuthClient({
	baseURL: env.apiUrl,
	// On web the browser owns cookies, so send credentials and skip the
	// SecureStore cookie shim (browsers forbid setting the Cookie header).
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
			// When sign-in needs a TOTP code, better-auth fires this instead of
			// completing the session — send the user to the challenge screen.
			onTwoFactorRedirect() {
				router.push("/(auth)/mfa");
			},
		}),
	],
});

export const { signIn, signUp, signOut, useSession, twoFactor } = authClient;
