// The Android prompt lives in notification-permission.android.ts; other
// platforms ask through Firebase in lib/push.ts instead.
export async function requestAndroidNotificationPermission(): Promise<boolean> {
	return true;
}
