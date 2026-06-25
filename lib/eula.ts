export const EULA_ACCEPTED_KEY = "hp-eula-accepted-at";

export function eulaNeedsAcceptance(
	acceptedAt: string | null,
	serverUpdatedAt: string | null,
): boolean {
	if (!serverUpdatedAt) return false;
	const server = new Date(serverUpdatedAt).getTime();
	if (Number.isNaN(server)) return false;
	if (!acceptedAt) return true;
	const accepted = new Date(acceptedAt).getTime();
	if (Number.isNaN(accepted)) return true;
	return accepted < server;
}
