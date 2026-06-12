import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { EULA_ACCEPTED_KEY, eulaNeedsAcceptance } from "@/lib/eula";
import { orpc } from "@/lib/orpc";

export function useEula() {
	const info = useQuery({
		...orpc.legal.info.queryOptions(),
		staleTime: 5 * 60 * 1000,
		retry: 1,
	});
	const [acceptedAt, setAcceptedAt] = useState<string | null>(null);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		AsyncStorage.getItem(EULA_ACCEPTED_KEY).then((v) => {
			// Don't overwrite a stamp accept() already set
			setAcceptedAt((current) => current ?? v);
			setLoaded(true);
		});
	}, []);

	const serverUpdatedAt = info.data?.eulaUpdatedAt
		? new Date(info.data.eulaUpdatedAt).toISOString()
		: null;

	const accept = useCallback(() => {
		// Offline first-run has no server date yet — stamp "now" so onboarding
		// can complete; a newer server date will re-gate on a later launch.
		const stamp = serverUpdatedAt ?? new Date().toISOString();
		setAcceptedAt(stamp);
		AsyncStorage.setItem(EULA_ACCEPTED_KEY, stamp).catch(() => {});
	}, [serverUpdatedAt]);

	return {
		// Onboarding lock: has this device EVER accepted anything?
		accepted: acceptedAt != null,
		// Update gate: is the device's acceptance stale vs a KNOWN server date?
		needsAcceptance: loaded && eulaNeedsAcceptance(acceptedAt, serverUpdatedAt),
		serverUpdatedAt,
		accept,
	};
}
