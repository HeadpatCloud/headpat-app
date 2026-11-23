import { kvGet, kvSet } from "@/lib/db/kv";
import { client } from "@/lib/orpc";
import { readWidgetSettings } from "@/widgets/settings";

type Summary = Awaited<ReturnType<typeof client.widget.summary>>;

export type WidgetEvent = Omit<
	NonNullable<Summary["nextEvent"]>,
	"startsAt" | "endsAt"
> & {
	startsAt: number;
	endsAt: number | null;
};

type SummaryChats = NonNullable<Summary["chats"]>;
export type WidgetChat = Omit<
	SummaryChats["items"][number],
	"lastMessageAt"
> & {
	lastMessageAt: number | null;
};
export type WidgetChats = Omit<SummaryChats, "items"> & { items: WidgetChat[] };

/** What the widgets draw. Stored so they render instantly and offline. */
export interface WidgetSnapshot {
	fetchedAt: number;
	signedIn: boolean;
	nextEvent: WidgetEvent | null;
	/** null while signed out. */
	chats: WidgetChats | null;
}

const SNAPSHOT_KEY = "hp-widget-snapshot";

export function readWidgetSnapshot(): WidgetSnapshot | null {
	const raw = kvGet(SNAPSHOT_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as WidgetSnapshot;
	} catch {
		return null;
	}
}

/**
 * Fetches fresh widget data and stores it. On failure (offline, API down) the
 * last snapshot stays, so a widget never blanks out over a bad connection.
 */
export async function refreshWidgetSnapshot(): Promise<WidgetSnapshot | null> {
	const { settings } = readWidgetSettings();
	try {
		const summary = await client.widget.summary({
			includePublicEvents: settings.nextEvent.includePublic,
			chatPreviews: settings.chats.showPreviews,
		});
		const ev = summary.nextEvent;
		const snapshot: WidgetSnapshot = {
			fetchedAt: Date.now(),
			signedIn: summary.signedIn,
			nextEvent: ev
				? {
						...ev,
						startsAt: new Date(ev.startsAt).getTime(),
						endsAt: ev.endsAt ? new Date(ev.endsAt).getTime() : null,
					}
				: null,
			chats: summary.chats
				? {
						...summary.chats,
						items: summary.chats.items.map((c) => ({
							...c,
							lastMessageAt: c.lastMessageAt
								? new Date(c.lastMessageAt).getTime()
								: null,
						})),
					}
				: null,
		};
		kvSet(SNAPSHOT_KEY, JSON.stringify(snapshot));
		return snapshot;
	} catch {
		return readWidgetSnapshot();
	}
}
