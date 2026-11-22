import { PermissionsAndroid, Platform } from "react-native";

// rnfirebase's requestPermission() is a no-op on Android; the runtime
// POST_NOTIFICATIONS prompt (Android 13+) goes via PermissionsAndroid.
export async function requestAndroidNotificationPermission(): Promise<boolean> {
	if (Number(Platform.Version) < 33) return true;
	const res = await PermissionsAndroid.request(
		PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
	);
	return res === PermissionsAndroid.RESULTS.GRANTED;
}
