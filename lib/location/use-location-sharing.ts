import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { locationApi, locationQueries } from "@/lib/location/api";
import {
	startSharingUpdates,
	stopSharingUpdates,
} from "@/lib/location/background-task";
import { ensureBackgroundPermission } from "@/lib/location/permissions";

function isActive(s: {
	revokedAt: Date | string | null;
	expiresAt: Date | string | null;
}): boolean {
	if (s.revokedAt) return false;
	// expiresAt may be a Date (fresh fetch) or an ISO string (rehydrated from the
	// persisted cache) — coerce so .getTime() is always safe.
	return s.expiresAt === null || new Date(s.expiresAt).getTime() > Date.now();
}

// Collection follows sharing: run the background task while ≥1 active share
// exists AND background permission is granted. Crucially, this never PROMPTS for
// background location — Google Play requires a prominent in-app disclosure before
// the request, so prompting is gated behind enableBackgroundSharing() (called
// only after the user accepts the disclosure). Also exposes pause/resume.
export function useLocationSharing() {
	const shares = useQuery(locationQueries.mine());
	const activeCount = (shares.data ?? []).filter(isActive).length;
	const [bgGranted, setBgGranted] = useState<boolean | null>(null);

	// Read the current permission status without prompting.
	useEffect(() => {
		let cancelled = false;
		Location.getBackgroundPermissionsAsync()
			.then((r) => !cancelled && setBgGranted(r.granted))
			.catch(() => !cancelled && setBgGranted(false));
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (activeCount > 0 && bgGranted) void startSharingUpdates();
		else if (activeCount === 0) void stopSharingUpdates();
	}, [activeCount, bgGranted]);

	// Call this AFTER showing the prominent disclosure and getting consent — it's
	// the only path that requests the background-location permission.
	const enableBackgroundSharing = useCallback(async () => {
		const ok = await ensureBackgroundPermission();
		setBgGranted(ok);
		if (ok) await startSharingUpdates();
		return ok;
	}, []);

	return {
		activeCount,
		backgroundGranted: bgGranted === true,
		// Sharing is active but background location isn't granted yet — the UI must
		// show the disclosure before calling enableBackgroundSharing().
		needsBackgroundConsent: activeCount > 0 && bgGranted === false,
		enableBackgroundSharing,
		pause: () => locationApi.pause(),
		resume: () => locationApi.resume(),
	};
}
