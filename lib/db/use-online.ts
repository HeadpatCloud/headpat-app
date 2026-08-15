import { onlineManager } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/**
 * Connectivity as React state. onlineManager is already driven from NetInfo in
 * lib/query.ts, so this is the one place that knows whether reads should come
 * from the network or from the persisted collections.
 */
export function useOnline(): boolean {
	const [online, setOnline] = useState(() => onlineManager.isOnline());
	useEffect(() => onlineManager.subscribe(setOnline), []);
	return online;
}
