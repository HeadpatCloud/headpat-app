import { useQueries } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { client } from "@/lib/orpc";

export type MentionUser = {
	userId: string;
	profileUrl: string;
	displayName: string | null;
	name: string | null;
	avatarFileId: string | null;
};

type Waiter = {
	resolve: (user: MentionUser | null) => void;
	reject: (error: unknown) => void;
};

// The API caps one lookup at 50 names.
const BATCH_SIZE = 50;
// Long enough for every message or comment on screen to queue its names.
const BATCH_DELAY_MS = 15;

let queue = new Map<string, Waiter[]>();
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
	timer = null;
	const entries = [...queue];
	queue = new Map();
	for (let i = 0; i < entries.length; i += BATCH_SIZE) {
		const chunk = entries.slice(i, i + BATCH_SIZE);
		client.profile.mentions({ handles: chunk.map(([handle]) => handle) }).then(
			(rows) => {
				const byHandle = new Map(rows.map((r) => [r.handle, r]));
				for (const [handle, waiters] of chunk) {
					const row = byHandle.get(handle);
					const user: MentionUser | null = row
						? {
								userId: row.userId,
								profileUrl: row.profileUrl,
								displayName: row.displayName,
								name: row.name,
								avatarFileId: row.avatarFileId,
							}
						: null;
					for (const w of waiters) w.resolve(user);
				}
			},
			(error: unknown) => {
				for (const [, waiters] of chunk)
					for (const w of waiters) w.reject(error);
			},
		);
	}
}

/** Looks one name up, sharing a single request with every other name asked
 *  for in the same moment. */
function loadMention(handle: string): Promise<MentionUser | null> {
	return new Promise((resolve, reject) => {
		const waiters = queue.get(handle);
		if (waiters) waiters.push({ resolve, reject });
		else queue.set(handle, [{ resolve, reject }]);
		if (!timer) timer = setTimeout(flush, BATCH_DELAY_MS);
	});
}

/** The users behind `handles` that exist and are visible to the viewer. Names
 *  that don't resolve are missing from the map. */
export function useMentionUsers(handles: string[]): Map<string, MentionUser> {
	const { data: session } = useSession();
	// Blocks depend on who is looking, so each viewer gets their own cache.
	const viewer = session?.user?.id ?? "guest";
	return useQueries({
		queries: handles.map((handle) => ({
			queryKey: ["mention-user", viewer, handle],
			queryFn: () => loadMention(handle),
			staleTime: 5 * 60 * 1000,
			gcTime: 30 * 60 * 1000,
			retry: 1,
		})),
		combine: (results) => {
			const users = new Map<string, MentionUser>();
			results.forEach((r, i) => {
				if (r.data) users.set(handles[i], r.data);
			});
			return users;
		},
	});
}
