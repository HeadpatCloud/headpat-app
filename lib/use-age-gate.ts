import { useCallback, useState } from "react";
import { AGE_CLEARED_KEY } from "@/lib/age-gate";
import { kvGet, kvSet } from "@/lib/db/kv";

export function useAgeGate() {
	// Read synchronously in the initialiser: an async read would render one frame
	// with no stamp, which for a compliance gate means flashing content before
	// gating it.
	const [clearedAt, setClearedAt] = useState<string | null>(() =>
		kvGet(AGE_CLEARED_KEY),
	);

	const clear = useCallback(() => {
		const stamp = new Date().toISOString();
		setClearedAt(stamp);
		kvSet(AGE_CLEARED_KEY, stamp);
	}, []);

	return {
		// One-time: once cleared we never re-ask (age only increases). A read that
		// throws leaves this null, so the gate fails closed.
		needsAgeCheck: clearedAt == null,
		clear,
	};
}
