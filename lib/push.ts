import { isRunningInExpoGo } from "expo";
import { PermissionsAndroid, Platform } from "react-native";
import { client } from "@/lib/orpc";

type MessagingModule =
	typeof import("@react-native-firebase/messaging").default;

// @react-native-firebase is native-only and absent in Expo Go / on web, so load
// it lazily behind a guard. Everything here no-ops where it isn't available.
function getMessaging(): MessagingModule | null {
	if (Platform.OS === "web" || isRunningInExpoGo()) return null;
	return require("@react-native-firebase/messaging").default;
}

function nativePlatform(): "ios" | "android" | null {
	if (Platform.OS === "ios") return "ios";
	if (Platform.OS === "android") return "android";
	return null;
}

// Remember the last token so we can unregister it on sign-out even after the
// session cookie is gone.
let lastToken: string | null = null;

async function ensurePermission(m: MessagingModule): Promise<boolean> {
	const status = await m().requestPermission();
	return (
		status === m.AuthorizationStatus.AUTHORIZED ||
		status === m.AuthorizationStatus.PROVISIONAL
	);
}

export async function registerPushToken(): Promise<void> {
	const m = getMessaging();
	const platform = nativePlatform();
	if (!m || !platform) return;
	try {
		if (platform === "ios") {
			if (!(await ensurePermission(m))) return;
			// iOS must register with APNs before Firebase can mint an FCM token.
			await m().registerDeviceForRemoteMessages();
		} else if (Number(Platform.Version) >= 33) {
			// rnfirebase's requestPermission() is a no-op on Android; the runtime
			// POST_NOTIFICATIONS prompt (Android 13+) goes via PermissionsAndroid.
			const res = await PermissionsAndroid.request(
				PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
			);
			if (res !== PermissionsAndroid.RESULTS.GRANTED) return;
		}
		const token = await m().getToken();
		lastToken = token;
		await client.pushToken.register({ token, platform });
	} catch (e) {
		console.warn("[push] registration failed", e);
	}
}

// Call this BEFORE signOut — unregister is an authed endpoint, so it needs the
// session still alive.
export async function unregisterPushToken(): Promise<void> {
	const m = getMessaging();
	if (!m) return;
	try {
		const token = lastToken ?? (await m().getToken());
		await client.pushToken.unregister({ token });
		lastToken = null;
	} catch (e) {
		console.warn("[push] unregister failed", e);
	}
}

// The OS rotates FCM tokens (reinstall/restore/data-clear); re-register so the
// backend never holds a stale token. Returns an unsubscribe function.
export function attachPushTokenRotation(): () => void {
	const m = getMessaging();
	const platform = nativePlatform();
	if (!m || !platform) return () => {};
	return m().onTokenRefresh((token: string) => {
		lastToken = token;
		client.pushToken.register({ token, platform }).catch(() => {});
	});
}

// Open the linked screen when a notification is tapped — both the cold-start tap
// that launched the app and taps while it's backgrounded. Returns an unsubscribe.
export function attachNotificationTapHandler(
	onLink: (link: string) => void,
): () => void {
	const m = getMessaging();
	if (!m) return () => {};
	const route = (link: unknown) => {
		if (typeof link === "string") onLink(link);
	};
	m()
		.getInitialNotification()
		.then((msg) => route(msg?.data?.link))
		.catch(() => {});
	return m().onNotificationOpenedApp((msg) => route(msg?.data?.link));
}
