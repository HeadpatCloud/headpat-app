import * as Location from "expo-location";

// When-In-Use only (foreground sharing). Returns whether granted.
export async function ensureForegroundPermission(): Promise<boolean> {
	const res = await Location.requestForegroundPermissionsAsync();
	return res.granted;
}

// Escalate to Always (required for background sharing). Foreground must be
// granted first; returns false (caller degrades to foreground-only) if denied.
export async function ensureBackgroundPermission(): Promise<boolean> {
	const fg = await Location.requestForegroundPermissionsAsync();
	if (!fg.granted) return false;
	const bg = await Location.requestBackgroundPermissionsAsync();
	return bg.granted;
}
