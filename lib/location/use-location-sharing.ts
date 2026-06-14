import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { locationApi, locationQueries } from "@/lib/location/api";
import {
	startSharingUpdates,
	stopSharingUpdates,
} from "@/lib/location/background-task";
import { ensureBackgroundPermission } from "@/lib/location/permissions";

function isActive(s: {
	revokedAt: Date | null;
	expiresAt: Date | null;
}): boolean {
	if (s.revokedAt) return false;
	return s.expiresAt === null || s.expiresAt.getTime() > Date.now();
}

// Collection follows sharing: run the background task only while ≥1 active share
// exists; stop it otherwise. Also exposes pause/resume.
export function useLocationSharing() {
	const shares = useQuery(locationQueries.mine());
	const activeCount = (shares.data ?? []).filter(isActive).length;

	useEffect(() => {
		let cancelled = false;
		(async () => {
			if (activeCount > 0) {
				const ok = await ensureBackgroundPermission();
				if (!cancelled && ok) await startSharingUpdates();
			} else {
				await stopSharingUpdates();
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [activeCount]);

	return {
		activeCount,
		pause: () => locationApi.pause(),
		resume: () => locationApi.resume(),
	};
}
