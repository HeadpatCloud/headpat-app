import {
	focusManager,
	onlineManager,
	QueryClient,
} from "@tanstack/react-query";
import type {
	PersistedClient,
	Persister,
} from "@tanstack/react-query-persist-client";
import { AppState, type AppStateStatus, Platform } from "react-native";
import { kvGet, kvRemove, kvSet } from "@/lib/db/kv";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000,
			gcTime: 24 * 60 * 60 * 1000,
			retry: 2,
		},
	},
});

// Drive React Query's "focused" state from app foreground/background. Without
// this, RN never reports focus, so interval refetches keep firing while the app
// is backgrounded (battery drain) and queries never refresh when the user
// returns. With it, polling pauses in the background and stale data refreshes on
// foreground — freshness without adding any timers.
if (Platform.OS !== "web") {
	AppState.addEventListener("change", (status: AppStateStatus) => {
		focusManager.setFocused(status === "active");
	});

	// Pause queries while offline so we don't fire requests (and retries) with no
	// network — saves the radio/battery and refetches automatically on reconnect.
	// NetInfo is a native module; guard so the bundle still runs in builds where
	// it isn't compiled in yet (Expo Go, a dev client built before this dep).
	try {
		const NetInfo = require("@react-native-community/netinfo")
			.default as typeof import("@react-native-community/netinfo").default;
		onlineManager.setEventListener((setOnline) =>
			NetInfo.addEventListener((state) =>
				setOnline(Boolean(state.isConnected)),
			),
		);
	} catch {
		// NetInfo unavailable in this build — React Query assumes always-online.
	}
}

// Exported so the storage screen clears the same key the persister writes.
export const CACHE_KEY = "headpat-cache-v2";

export function cacheSize(): number {
	return kvGet(CACHE_KEY)?.length ?? 0;
}

// persistQueryClientSubscribe calls persistClient on every cache event and does
// no throttling of its own — createAsyncStoragePersister used to supply that. A
// trailing throttle is therefore required, not an optimisation: without it every
// query event would JSON.stringify the whole cache on the JS thread.
const WRITE_THROTTLE_MS = 10_000;
let pending: ReturnType<typeof setTimeout> | null = null;
let latest: PersistedClient | null = null;

function flush() {
	pending = null;
	if (!latest) return;
	const client = latest;
	latest = null;
	kvSet(CACHE_KEY, JSON.stringify(client));
}

// Backed by the same synchronous store as preferences, so restore happens without
// an async hop on startup.
export const persister: Persister = {
	persistClient: (client: PersistedClient) => {
		latest = client;
		if (pending) return;
		pending = setTimeout(flush, WRITE_THROTTLE_MS);
	},
	restoreClient: () => {
		const raw = kvGet(CACHE_KEY);
		if (!raw) return undefined;
		try {
			return JSON.parse(raw) as PersistedClient;
		} catch {
			// A truncated or half-written blob must not wedge startup.
			kvRemove(CACHE_KEY);
			return undefined;
		}
	},
	removeClient: () => {
		// Drop any queued write, or a stale snapshot would land after the clear.
		if (pending) clearTimeout(pending);
		pending = null;
		latest = null;
		kvRemove(CACHE_KEY);
	},
};
