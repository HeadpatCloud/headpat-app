import * as Location from "expo-location";

// Escalate to Always (required for background sharing). Foreground must be
// granted first; returns false (caller degrades to foreground-only) if denied.
export async function ensureBackgroundPermission(): Promise<boolean> {
	const fg = await Location.requestForegroundPermissionsAsync();
	if (!fg.granted) return false;
	const bg = await Location.requestBackgroundPermissionsAsync();
	return bg.granted;
}
