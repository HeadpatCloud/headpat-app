import { isRunningInExpoGo } from "expo";
import { PermissionsAndroid, Platform } from "react-native";
import { client } from "@/lib/orpc";

type MessagingApi = typeof import("@react-native-firebase/messaging");

// @react-native-firebase is native-only and absent in Expo Go / on web, so load
// it lazily behind a guard. Everything here no-ops where it isn't available.
function getMessagingApi(): MessagingApi | null {
	if (Platform.OS === "web" || isRunningInExpoGo()) return null;
	return require("@react-native-firebase/messaging");
}

function nativePlatform(): "ios" | "android" | null {
	if (Platform.OS === "ios") return "ios";
	if (Platform.OS === "android") return "android";
	return null;
}

// Remember the last token so we can unregister it on sign-out even after the
// session cookie is gone.
let lastToken: string | null = null;

async function ensurePermission(api: MessagingApi): Promise<boolean> {
	const status = await api.requestPermission(api.getMessaging());
	return (
		status === api.AuthorizationStatus.AUTHORIZED ||
		status === api.AuthorizationStatus.PROVISIONAL
	);
}

export async function registerPushToken(): Promise<void> {
	const api = getMessagingApi();
	const platform = nativePlatform();
	if (!api || !platform) return;
	try {
		if (platform === "ios") {
			if (!(await ensurePermission(api))) return;
			// iOS must register with APNs before Firebase can mint an FCM token.
			await api.registerDeviceForRemoteMessages(api.getMessaging());
		} else if (Number(Platform.Version) >= 33) {
			// rnfirebase's requestPermission() is a no-op on Android; the runtime
			// POST_NOTIFICATIONS prompt (Android 13+) goes via PermissionsAndroid.
			const res = await PermissionsAndroid.request(
				PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
			);
			if (res !== PermissionsAndroid.RESULTS.GRANTED) return;
		}
		const token = await api.getToken(api.getMessaging());
		lastToken = token;
		await client.pushToken.register({ token, platform });
	} catch (e) {
		console.warn("[push] registration failed", e);
	}
}

// Call this BEFORE signOut — unregister is an authed endpoint, so it needs the
// session still alive.
export async function unregisterPushToken(): Promise<void> {
	const api = getMessagingApi();
	if (!api) return;
	try {
		const token = lastToken ?? (await api.getToken(api.getMessaging()));
		await client.pushToken.unregister({ token });
		lastToken = null;
	} catch (e) {
		console.warn("[push] unregister failed", e);
	}
}

// The OS rotates FCM tokens (reinstall/restore/data-clear); re-register so the
// backend never holds a stale token. Returns an unsubscribe function.
export function attachPushTokenRotation(): () => void {
	const api = getMessagingApi();
	const platform = nativePlatform();
	if (!api || !platform) return () => {};
	return api.onTokenRefresh(api.getMessaging(), (token: string) => {
		lastToken = token;
		client.pushToken.register({ token, platform }).catch(() => {});
	});
}

// Refresh in-app data when a push arrives while the app is foregrounded. FCM
// delivers these via onMessage; background/quit messages go to the OS tray and
// are handled on tap instead. This is the battery-friendly way to stay current —
// the server tells us when something changed, so we don't poll. Returns an
// unsubscribe.
export function attachForegroundMessageHandler(
	onMessage: () => void,
): () => void {
	const api = getMessagingApi();
	if (!api) return () => {};
	return api.onMessage(api.getMessaging(), () => onMessage());
}

// Open the linked screen when a notification is tapped — both the cold-start tap
// that launched the app and taps while it's backgrounded. Returns an unsubscribe.
export function attachNotificationTapHandler(
	onLink: (link: string) => void,
): () => void {
	const api = getMessagingApi();
	if (!api) return () => {};
	const route = (link: unknown) => {
		if (typeof link === "string") onLink(link);
	};
	api
		.getInitialNotification(api.getMessaging())
		.then((msg) => route(msg?.data?.link))
		.catch(() => {});
	return api.onNotificationOpenedApp(api.getMessaging(), (msg) =>
		route(msg?.data?.link),
	);
}
