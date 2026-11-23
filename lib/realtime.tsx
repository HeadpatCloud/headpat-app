import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { AppState } from "react-native";
import { authClient, useSession } from "@/lib/auth-client";
import { env } from "@/lib/env";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query";

// The same socket the website keeps open (/api/ws). It carries new messages,
// typing and presence; this app uses it for chat. It only runs while the app is
// in the foreground, so it costs nothing in the background.

const HEARTBEAT_MS = 30_000;
const TYPING_TTL_MS = 6_000;
const TYPING_SEND_EVERY_MS = 3_000;
const MAX_BACKOFF_MS = 30_000;

type WsIn = {
	type?: string;
	userId?: string;
	conversationId?: string;
	channelId?: string;
	message?: { senderId?: string };
};

// Typing state lives outside React state so a keystroke elsewhere never
// re-renders the whole tree: each thread subscribes to its own conversation.
// Channels share the map under their own key (see channelTypingKey).
type TypingMap = Record<string, Record<string, number>>;
let typing: TypingMap = {};
const typingListeners = new Set<() => void>();
function setTyping(next: TypingMap) {
	typing = next;
	for (const l of typingListeners) l();
}
function subscribeTyping(l: () => void) {
	typingListeners.add(l);
	return () => typingListeners.delete(l);
}

export const channelTypingKey = (channelId: string) => `channel:${channelId}`;

function clearTyper(key: string, userId: string | undefined) {
	const entry = typing[key];
	if (!userId || !entry || !(userId in entry)) return;
	const { [userId]: _gone, ...rest } = entry;
	setTyping({ ...typing, [key]: rest });
}

function markTyper(key: string, userId: string) {
	setTyping({
		...typing,
		[key]: { ...(typing[key] ?? {}), [userId]: Date.now() + TYPING_TTL_MS },
	});
}

interface RealtimeValue {
	connected: boolean;
	sendTyping: (conversationId: string) => void;
	sendChannelTyping: (channelId: string) => void;
}

const RealtimeContext = createContext<RealtimeValue>({
	connected: false,
	sendTyping: () => {},
	sendChannelTyping: () => {},
});

export function useRealtime(): RealtimeValue {
	return useContext(RealtimeContext);
}

function invalidateChannel(channelId?: string) {
	queryClient.invalidateQueries({
		queryKey: channelId
			? orpc.channel.messages.key({ input: { channelId } })
			: orpc.channel.messages.key(),
	});
}

function invalidateChat(conversationId?: string) {
	queryClient.invalidateQueries({
		queryKey: orpc.message.myConversations.key(),
	});
	queryClient.invalidateQueries({ queryKey: orpc.message.unreadCounts.key() });
	queryClient.invalidateQueries({
		queryKey: conversationId
			? orpc.message.list.key({ input: { conversationId } })
			: orpc.message.list.key(),
	});
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
	const { data: session } = useSession();
	const userId = session?.user?.id ?? null;
	const [connected, setConnected] = useState(false);
	const wsRef = useRef<WebSocket | null>(null);
	const lastTypingSent = useRef<Record<string, number>>({});

	useEffect(() => {
		if (!userId) return;
		let ws: WebSocket | null = null;
		let heartbeat: ReturnType<typeof setInterval> | null = null;
		let retry: ReturnType<typeof setTimeout> | null = null;
		let attempts = 0;
		let stopped = false;
		const url = `${env.apiUrl.replace(/^http/, "ws")}/api/ws`;

		const clearTimers = () => {
			if (heartbeat) clearInterval(heartbeat);
			if (retry) clearTimeout(retry);
			heartbeat = null;
			retry = null;
		};

		const connect = () => {
			if (stopped || ws) return;
			const cookie = authClient.getCookie();
			// React Native's WebSocket takes headers as a third argument; the
			// session cookie authenticates the socket just like an RPC call.
			const socket = new (
				WebSocket as unknown as new (
					url: string,
					protocols: string[] | undefined,
					options: { headers: Record<string, string> },
				) => WebSocket
			)(url, undefined, { headers: cookie ? { Cookie: cookie } : {} });
			ws = socket;
			wsRef.current = socket;
			socket.onopen = () => {
				attempts = 0;
				setConnected(true);
				heartbeat = setInterval(() => {
					if (socket.readyState === WebSocket.OPEN)
						socket.send(JSON.stringify({ type: "heartbeat" }));
				}, HEARTBEAT_MS);
				// Messages may have arrived while we were offline.
				invalidateChat();
				invalidateChannel();
			};
			socket.onmessage = (e) => {
				let msg: WsIn;
				try {
					msg = JSON.parse(String(e.data));
				} catch {
					return;
				}
				if (msg.type === "message" && msg.conversationId) {
					invalidateChat(msg.conversationId);
					clearTyper(msg.conversationId, msg.message?.senderId);
				} else if (msg.type === "message" && msg.channelId) {
					invalidateChannel(msg.channelId);
					clearTyper(channelTypingKey(msg.channelId), msg.message?.senderId);
				} else if (msg.type === "typing" && msg.conversationId && msg.userId) {
					markTyper(msg.conversationId, msg.userId);
				} else if (msg.type === "typing" && msg.channelId && msg.userId) {
					markTyper(channelTypingKey(msg.channelId), msg.userId);
				}
			};
			socket.onclose = () => {
				clearTimers();
				ws = null;
				wsRef.current = null;
				setConnected(false);
				if (stopped) return;
				const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempts);
				attempts += 1;
				retry = setTimeout(connect, delay);
			};
			socket.onerror = () => socket.close();
		};

		const disconnect = () => {
			clearTimers();
			const socket = ws;
			ws = null;
			wsRef.current = null;
			socket?.close();
			setConnected(false);
		};

		connect();
		const sub = AppState.addEventListener("change", (state) => {
			if (state === "active") {
				stopped = false;
				connect();
			} else if (state === "background") {
				stopped = true;
				disconnect();
			}
		});
		return () => {
			stopped = true;
			sub.remove();
			disconnect();
			setTyping({});
		};
	}, [userId]);

	// Throttled per conversation or channel, like the website.
	const sendTypingFor = useCallback(
		(
			key: string,
			payload: { conversationId: string } | { channelId: string },
		) => {
			const socket = wsRef.current;
			if (!socket || socket.readyState !== WebSocket.OPEN) return;
			const now = Date.now();
			if (now - (lastTypingSent.current[key] ?? 0) < TYPING_SEND_EVERY_MS)
				return;
			lastTypingSent.current[key] = now;
			socket.send(JSON.stringify({ type: "typing", ...payload }));
		},
		[],
	);
	const sendTyping = useCallback(
		(conversationId: string) =>
			sendTypingFor(conversationId, { conversationId }),
		[sendTypingFor],
	);
	const sendChannelTyping = useCallback(
		(channelId: string) =>
			sendTypingFor(channelTypingKey(channelId), { channelId }),
		[sendTypingFor],
	);

	const value = useMemo(
		() => ({ connected, sendTyping, sendChannelTyping }),
		[connected, sendTyping, sendChannelTyping],
	);
	return (
		<RealtimeContext.Provider value={value}>
			{children}
		</RealtimeContext.Provider>
	);
}

const NO_TYPERS: string[] = [];

// User ids currently typing in a conversation, or in a channel when given
// channelTypingKey(id) (excluding expired entries). The
// snapshot is cached per map identity so useSyncExternalStore stays stable.
export function useTypingUsers(conversationId: string): string[] {
	const cache = useRef<{ map: TypingMap; ids: string[] } | null>(null);
	const [, tick] = useState(0);
	const ids = useSyncExternalStore(subscribeTyping, () => {
		const c = cache.current;
		if (c && c.map === typing) return c.ids;
		const now = Date.now();
		const entries = Object.entries(typing[conversationId] ?? {})
			.filter(([, until]) => until > now)
			.map(([id]) => id);
		const next = entries.length ? entries : NO_TYPERS;
		cache.current = { map: typing, ids: next };
		return next;
	});
	// Expire the indicator without another socket event.
	useEffect(() => {
		if (ids.length === 0) return;
		const t = setTimeout(() => {
			cache.current = null;
			tick((n) => n + 1);
		}, TYPING_TTL_MS);
		return () => clearTimeout(t);
	}, [ids]);
	return ids;
}
