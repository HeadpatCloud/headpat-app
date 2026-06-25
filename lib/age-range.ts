import { requestAgeRangeAsync } from "expo-age-range";
import { Platform } from "react-native";

export type AgeSignal = "adult" | "minor" | "unavailable";

// Pure mapping of an expo-age-range response to our coarse signal.
export function mapAgeResponse(res: {
	lowerBound: number | null;
	upperBound: number | null;
}): AgeSignal {
	if (typeof res.lowerBound === "number" && res.lowerBound >= 18)
		return "adult";
	if (typeof res.upperBound === "number" && res.upperBound < 18) return "minor";
	return "unavailable";
}

// A real OS age signal exists only on Android and iOS 26+. On older iOS (and
// web) expo-age-range returns a DEFAULT ADULT response, so we must short-circuit
// to "unavailable" here — otherwise the DOB fallback would never run.
function hasNativeSignal(): boolean {
	if (Platform.OS === "android") return true;
	if (Platform.OS === "ios") {
		return Number.parseInt(String(Platform.Version), 10) >= 26;
	}
	return false;
}

export async function checkAgeSignal(): Promise<AgeSignal> {
	if (!hasNativeSignal()) return "unavailable";
	try {
		const res = await requestAgeRangeAsync({ threshold1: 18 });
		return mapAgeResponse(res);
	} catch {
		// ERR_AGE_RANGE_USER_DECLINED / NOT_AVAILABLE / INVALID_REQUEST, or the
		// native module being absent (Expo Go). Degrade to the DOB fallback.
		return "unavailable";
	}
}
