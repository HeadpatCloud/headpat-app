// Coarse "time left" token. Callers map "indefinite"/"expired" to i18n strings
// and render the m/h/d tokens with a unit label.
export function timeLeftLabel(expiresAt: string | null, now: Date = new Date()): string {
	if (expiresAt === null) return "indefinite";
	const ms = new Date(expiresAt).getTime() - now.getTime();
	if (ms <= 0) return "expired";
	const mins = Math.floor(ms / 60_000);
	if (mins < 60) return `${mins}m`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h`;
	return `${Math.floor(hrs / 24)}d`;
}
