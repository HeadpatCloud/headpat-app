import { client, orpc } from "@/lib/orpc";

// Reads use react-query options; writes call the client directly (codebase pattern).
export const locationQueries = {
	visible: () => orpc.location.visibleLocations.queryOptions({ input: {} }),
	mine: () => orpc.location.listMyShares.queryOptions({ input: {} }),
	sharedWithMe: () => orpc.location.listSharedWithMe.queryOptions({ input: {} }),
};

export const locationApi = {
	grant: (input: { targetType: "user" | "community"; targetId: string; expiresAt: string | null; precision?: "exact" | "approximate" }) =>
		client.location.grant(input),
	extend: (input: { shareId: string; expiresAt: string | null }) => client.location.extend(input),
	revoke: (input: { shareId: string }) => client.location.revoke(input),
	updateLocation: (input: { lat: number; lng: number; accuracy?: number; heading?: number; speed?: number }) =>
		client.location.updateLocation(input),
	setStatus: (input: { statusText: string | null; statusColor: string | null }) => client.location.setStatus(input),
	pause: () => client.location.pause({}),
	resume: () => client.location.resume({}),
};
