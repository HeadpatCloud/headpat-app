export const EULA_ACCEPTED_KEY = "hp-eula-accepted-at";

export function eulaNeedsAcceptance(
	acceptedAt: string | null,
	serverUpdatedAt: string | null,
): boolean {
	if (!serverUpdatedAt) return false;
	if (!acceptedAt) return true;
	return new Date(acceptedAt) < new Date(serverUpdatedAt);
}
