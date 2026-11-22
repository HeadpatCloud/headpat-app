import { useEffect, useState } from "react";

// The value, but only after it has stopped changing for `ms`. Keeps search
// fields from firing a request per keystroke.
export function useDebouncedValue<T>(value: T, ms = 250): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), ms);
		return () => clearTimeout(id);
	}, [value, ms]);
	return debounced;
}
