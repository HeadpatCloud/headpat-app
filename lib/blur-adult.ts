import { useSyncExternalStore } from "react";
import { kvGet, kvSet } from "@/lib/db/kv";

// Per-device "blur 18+ pictures" switch, on unless turned off. Like the
// show-NSFW switch it stays on this device.
const KEY = "hp-blur-adult";
const listeners = new Set<() => void>();

function read(): boolean {
	return kvGet(KEY) !== "false";
}

export function setBlurAdult(on: boolean): void {
	kvSet(KEY, on ? "true" : "false");
	for (const l of listeners) l();
}

export function useBlurAdult(): boolean {
	return useSyncExternalStore(
		(cb) => {
			listeners.add(cb);
			return () => {
				listeners.delete(cb);
			};
		},
		read,
		read,
	);
}
