import { useCallback, useState } from "react";
import { AGE_CLEARED_KEY, AGE_DOB_KEY } from "@/lib/age-gate";
import { kvGet, kvSet } from "@/lib/db/kv";

export function useAgeGate() {
	// Read synchronously in the initialiser: an async read would render one frame
	// with no stamp, which for a compliance gate means flashing content before
	// gating it.
	const [clearedAt, setClearedAt] = useState<string | null>(() =>
		kvGet(AGE_CLEARED_KEY),
	);

	// `dob` is absent when the OS age signal cleared the gate — there's no date to
	// keep in that case, only the fact that the check passed.
	const clear = useCallback((dob?: Date) => {
		const stamp = new Date().toISOString();
		setClearedAt(stamp);
		kvSet(AGE_CLEARED_KEY, stamp);
		if (dob) kvSet(AGE_DOB_KEY, dob.toISOString());
	}, []);

	return {
		// One-time: once cleared we never re-ask (age only increases). A read that
		// throws leaves this null, so the gate fails closed.
		needsAgeCheck: clearedAt == null,
		clear,
	};
}
