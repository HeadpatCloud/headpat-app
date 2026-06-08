import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
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
	],
});

export const { signIn, signUp, signOut, useSession } = authClient;
