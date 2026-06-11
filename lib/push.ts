import { isRunningInExpoGo } from "expo";
import Constants from "expo-constants";
import type { NotificationResponse } from "expo-notifications";
import { Platform } from "react-native";
import { client } from "@/lib/orpc";

type NotificationsModule = typeof import("expo-notifications");

// expo-notifications' remote-push code throws on import in Expo Go (SDK 53+) and
// is meaningless on web, so only load it inside a real build (dev client /
// standalone). Everything here no-ops elsewhere.
function getNotifications(): NotificationsModule | null {
	if (Platform.OS === "web" || isRunningInExpoGo()) return null;
	return require("expo-notifications") as NotificationsModule;
}

const projectId = Constants.expoConfig?.extra?.eas?.projectId as
	| string
	| undefined;

// Remember the last token we obtained so we can unregister it on sign-out even
// after the session cookie is gone.
let lastToken: string | null = null;
let handlerSet = false;

// Foreground notifications still surface as a banner — without this the OS
// suppresses them while the app is open.
function ensureHandler(N: NotificationsModule): void {
	if (handlerSet) return;
	handlerSet = true;
	N.setNotificationHandler({
		handleNotification: async () => ({
			shouldShowBanner: true,
			shouldShowList: true,
			shouldPlaySound: true,
			shouldSetBadge: false,
		}),
	});
}

function nativePlatform(): "ios" | "android" | null {
	if (Platform.OS === "ios") return "ios";
	if (Platform.OS === "android") return "android";
	return null;
}

export async function registerPushToken(): Promise<void> {
	const N = getNotifications();
	const platform = nativePlatform();
	if (!N || !platform || !projectId) return;
	try {
		ensureHandler(N);
		let { status } = await N.getPermissionsAsync();
		if (status !== "granted") {
			status = (await N.requestPermissionsAsync()).status;
		}
		if (status !== "granted") return;

		if (platform === "android") {
			await N.setNotificationChannelAsync("default", {
				name: "Default",
				importance: N.AndroidImportance.DEFAULT,
			});
		}

		const { data: token } = await N.getExpoPushTokenAsync({ projectId });
		lastToken = token;
		await client.pushToken.register({ token, platform });
	} catch (e) {
		console.warn("[push] registration failed", e);
	}
}

// Call this BEFORE signOut — unregister is an authed endpoint, so it needs the
// session still alive.
export async function unregisterPushToken(): Promise<void> {
	const N = getNotifications();
	if (!N || !projectId) return;
	try {
		const token =
			lastToken ?? (await N.getExpoPushTokenAsync({ projectId })).data;
		await client.pushToken.unregister({ token });
		lastToken = null;
	} catch (e) {
		console.warn("[push] unregister failed", e);
	}
}

// Open the linked screen for a notification tap. Dedupe by request id so the
// cold-start launch response and a live listener delivery of the same tap don't
// fire twice. Returns an unsubscribe function.
export function attachNotificationTapHandler(
	onLink: (link: string) => void,
): () => void {
	const N = getNotifications();
	if (!N) return () => {};
	let handled: string | null = null;
	const handle = (res: NotificationResponse | null) => {
		if (!res || res.actionIdentifier !== N.DEFAULT_ACTION_IDENTIFIER) return;
		const id = res.notification.request.identifier;
		if (handled === id) return;
		handled = id;
		const link = res.notification.request.content.data?.link;
		if (typeof link === "string") onLink(link);
	};
	// Cold start: the tap that launched the app is captured natively before any
	// JS listener mounts, so the listener alone would miss it.
	handle(N.getLastNotificationResponse());
	const sub = N.addNotificationResponseReceivedListener(handle);
	return () => sub.remove();
}
