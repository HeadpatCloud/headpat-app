import { expoClient } from "@better-auth/expo/client";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { env } from "@/lib/env";

export const authClient = createAuthClient({
	baseURL: env.apiUrl,
	plugins: [
		expoClient({
			scheme: "headpat",
			storagePrefix: "headpat",
			storage: SecureStore,
		}),
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
