import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { client } from "@/lib/orpc";

// Foreground notifications still surface as a banner — without this the OS
// suppresses them while the app is open.
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: true,
		shouldSetBadge: false,
	}),
});

const projectId = Constants.expoConfig?.extra?.eas?.projectId as
	| string
	| undefined;

// Remember the last token we obtained so we can unregister it on sign-out even
// after the session cookie is gone.
let lastToken: string | null = null;

function nativePlatform(): "ios" | "android" | null {
	if (Platform.OS === "ios") return "ios";
	if (Platform.OS === "android") return "android";
	return null;
}

export async function registerPushToken(): Promise<void> {
	const platform = nativePlatform();
	if (!platform || !projectId) return;
	try {
		let { status } = await Notifications.getPermissionsAsync();
		if (status !== "granted") {
			status = (await Notifications.requestPermissionsAsync()).status;
		}
		if (status !== "granted") return;

		if (platform === "android") {
			await Notifications.setNotificationChannelAsync("default", {
				name: "Default",
				importance: Notifications.AndroidImportance.DEFAULT,
			});
		}

		const { data: token } = await Notifications.getExpoPushTokenAsync({
			projectId,
		});
		lastToken = token;
		await client.pushToken.register({ token, platform });
	} catch (e) {
		console.warn("[push] registration failed", e);
	}
}

// Call this BEFORE signOut — unregister is an authed endpoint, so it needs the
// session still alive.
export async function unregisterPushToken(): Promise<void> {
	if (!nativePlatform() || !projectId) return;
	try {
		const token =
			lastToken ??
			(await Notifications.getExpoPushTokenAsync({ projectId })).data;
		await client.pushToken.unregister({ token });
		lastToken = null;
	} catch (e) {
		console.warn("[push] unregister failed", e);
	}
}
