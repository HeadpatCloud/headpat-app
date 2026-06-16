// Presence statuses as the API reports them (effectiveStatus) and the manual
// statuses a user can set. Colors are used for the map marker ring + status dots.
export type PresenceStatus = "online" | "away" | "dnd" | "offline";
export type ManualStatus = "online" | "away" | "dnd" | "invisible";

export const PRESENCE_COLORS: Record<PresenceStatus, string> = {
	online: "#22c55e",
	away: "#f59e0b",
	dnd: "#ef4444",
	offline: "#9ca3af",
};

// invisible isn't a visible status (others see "offline") — use grey for its dot.
export const MANUAL_STATUS_COLORS: Record<ManualStatus, string> = {
	online: PRESENCE_COLORS.online,
	away: PRESENCE_COLORS.away,
	dnd: PRESENCE_COLORS.dnd,
	invisible: PRESENCE_COLORS.offline,
};

export function presenceColor(status?: string | null): string {
	return PRESENCE_COLORS[status as PresenceStatus] ?? PRESENCE_COLORS.offline;
}
