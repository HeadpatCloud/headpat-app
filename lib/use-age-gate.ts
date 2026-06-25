import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { AGE_CLEARED_KEY } from "@/lib/age-gate";

export function useAgeGate() {
	const [clearedAt, setClearedAt] = useState<string | null>(null);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		AsyncStorage.getItem(AGE_CLEARED_KEY).then((v) => {
			// Don't overwrite a stamp clear() already set this session.
			setClearedAt((current) => current ?? v);
			setLoaded(true);
		});
	}, []);

	const clear = useCallback(() => {
		const stamp = new Date().toISOString();
		setClearedAt(stamp);
		AsyncStorage.setItem(AGE_CLEARED_KEY, stamp).catch(() => {});
	}, []);

	return {
		// Gate until AsyncStorage has loaded AND no cleared stamp exists. One-time:
		// once cleared we never re-ask (age only increases).
		needsAgeCheck: loaded && clearedAt == null,
		clear,
	};
}
