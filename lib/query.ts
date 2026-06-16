import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
	focusManager,
	onlineManager,
	QueryClient,
} from "@tanstack/react-query";
import { AppState, type AppStateStatus, Platform } from "react-native";

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

export const persister = createAsyncStoragePersister({
	storage: AsyncStorage,
	key: "headpat-cache-v2",
});
