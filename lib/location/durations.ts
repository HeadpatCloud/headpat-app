export type DurationPreset = "5m" | "15m" | "1h" | "8h" | "1d" | "7d" | "indefinite";

export const DURATION_PRESETS: DurationPreset[] = ["5m", "15m", "1h", "8h", "1d", "7d", "indefinite"];

const MINUTES: Record<Exclude<DurationPreset, "indefinite">, number> = {
	"5m": 5, "15m": 15, "1h": 60, "8h": 480, "1d": 1440, "7d": 10080,
};

// Returns an ISO string for the absolute expiry, or null for "indefinite".
export function expiresAtFromPreset(preset: DurationPreset, now: Date = new Date()): string | null {
	if (preset === "indefinite") return null;
	return new Date(now.getTime() + MINUTES[preset] * 60_000).toISOString();
}

export function expiresAtFromCustom(date: Date): string {
	return date.toISOString();
}
