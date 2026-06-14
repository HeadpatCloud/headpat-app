import { Platform } from "react-native";
import { authClient } from "@/lib/auth-client";
import { env } from "@/lib/env";
import type { LiveEvent } from "@/lib/location/live-locations";

// The app has no existing websocket client. This connects to the backend /ws
// presence endpoint (same cookie auth as lib/orpc.ts), forwards location events,
// sends heartbeats, and reconnects with backoff.
const WS_URL = `${env.apiUrl.replace(/^http/, "ws")}/ws`;

type Handler = (evt: LiveEvent) => void;

export function connectLocationSocket(onEvent: Handler): () => void {
	let ws: WebSocket | null = null;
	let closed = false;
	let heartbeat: ReturnType<typeof setInterval> | null = null;
	let retry = 0;

	const open = () => {
		// Native sends the better-auth cookie via the optional headers arg; web relies
		// on the browser (app is native-only, so the cookie path is what matters).
		const cookie = Platform.OS === "web" ? undefined : authClient.getCookie();
		const options = cookie ? { headers: { Cookie: cookie } } : undefined;
		// @ts-expect-error React Native WebSocket supports a headers option not in the DOM lib
		ws = new WebSocket(WS_URL, undefined, options);
		ws.onopen = () => {
			retry = 0;
			heartbeat = setInterval(
				() => ws?.send(JSON.stringify({ type: "heartbeat" })),
				25_000,
			);
		};
		ws.onmessage = (e) => {
			let msg: {
				type?: string;
				userId?: string;
				location?: { lat: number; lng: number };
			};
			try {
				msg = JSON.parse(String(e.data));
			} catch {
				return;
			}
			if (msg.type === "location" && msg.userId && msg.location) {
				onEvent({
					type: "location",
					userId: msg.userId,
					location: msg.location,
				});
			} else if (msg.type === "location-share-ended" && msg.userId) {
				onEvent({ type: "location-share-ended", userId: msg.userId });
			}
		};
		ws.onclose = () => {
			if (heartbeat) clearInterval(heartbeat);
			if (closed) return;
			retry = Math.min(retry + 1, 6);
			setTimeout(open, 1000 * 2 ** retry);
		};
	};
	open();

	return () => {
		closed = true;
		if (heartbeat) clearInterval(heartbeat);
		ws?.close();
	};
}
