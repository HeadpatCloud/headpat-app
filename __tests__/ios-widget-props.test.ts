import type { WidgetSnapshot } from "@/widgets/data";
import { chatsProps, eventTimeline } from "@/widgets/ios-ui/props-builder";
import { DEFAULT_WIDGET_SETTINGS } from "@/widgets/settings";

jest.mock("@/lib/db/kv", () => ({ kvGet: () => null, kvSet: () => {} }));
jest.mock("@/widgets/look", () => ({
	widgetPalette: (scheme: "light" | "dark") => ({
		background: scheme === "dark" ? "#000000" : "#ffffff",
		foreground: "#111111",
		muted: "#222222",
		mutedForeground: "#333333",
		primary: "#444444",
		primaryForeground: "#555555",
		link: "#666666",
		border: "#777777",
	}),
	widgetSchemes: () => "system",
	wt: (key: string, opts?: { count?: number }) =>
		opts?.count === undefined ? key : `${key}:${opts.count}`,
	formatEventTime: (startsAt: number, now: number) =>
		startsAt <= now ? "now" : `in ${Math.round((startsAt - now) / 3_600_000)}h`,
}));

const now = new Date("2026-11-23T15:00:00").getTime();
const hour = 3_600_000;

function snapshot(partial: Partial<WidgetSnapshot>): WidgetSnapshot {
	return {
		fetchedAt: now,
		signedIn: true,
		nextEvent: null,
		chats: null,
		...partial,
	};
}

const event = {
	id: "e1",
	title: "Picnic",
	startsAt: now + 50 * hour,
	endsAt: now + 54 * hour,
	locationText: null,
	locationZoneMethod: "virtual",
	communityName: "Fluffy",
	going: true,
};

describe("eventTimeline", () => {
	it("adds an entry at each midnight, at the start and at the end", () => {
		const entries = eventTimeline(
			snapshot({ nextEvent: event }),
			DEFAULT_WIDGET_SETTINGS,
			now,
		);
		const times = entries.map((e) => e.date.getTime());
		expect(times).toEqual([...times].sort((a, b) => a - b));
		expect(times[0]).toBe(now);
		expect(times).toContain(event.startsAt);
		expect(times.at(-1)).toBe(event.endsAt);
		// Two midnights fall between now and the start.
		expect(
			entries.filter((e) => new Date(e.date).getHours() === 0),
		).toHaveLength(2);
		expect(entries[0].props.url).toBe("headpat://event/e1");
		expect(entries[0].props.label).toBe("event.going");
		expect(entries[0].props.where).toBe("event.online");
		expect(
			entries.find((e) => e.date.getTime() === event.startsAt)?.props.time,
		).toBe("now");
		// After the end the widget falls back to its empty state.
		expect(entries.at(-1)?.props.title).toBeNull();
	});

	it("shows the empty state with no event", () => {
		const entries = eventTimeline(snapshot({}), DEFAULT_WIDGET_SETTINGS, now);
		expect(entries).toHaveLength(1);
		expect(entries[0].props.title).toBeNull();
		expect(entries[0].props.url).toBe("headpat://events");
	});
});

describe("chatsProps", () => {
	const chats = {
		conversations: 1,
		messages: 2,
		items: [
			{
				id: "c1",
				title: "Alex",
				unread: 2,
				lastMessageAt: now,
				preview: { sender: "Alex", text: "hi", kind: "text" },
			},
		],
	};

	it("leaves out who wrote and what unless previews are on", () => {
		const off = chatsProps(snapshot({ chats }), DEFAULT_WIDGET_SETTINGS);
		expect(off.rows).toEqual([]);
		expect(off.count).toBe(1);
		const on = chatsProps(snapshot({ chats }), {
			...DEFAULT_WIDGET_SETTINGS,
			chats: { showPreviews: true },
		});
		expect(on.rows).toEqual([
			{ title: "Alex", text: "hi", unread: "2", url: "headpat://chat/c1" },
		]);
	});

	it("links to sign-in when signed out", () => {
		const p = chatsProps(
			snapshot({ signedIn: false }),
			DEFAULT_WIDGET_SETTINGS,
		);
		expect(p.signedIn).toBe(false);
		expect(p.url).toBe("headpat://login");
	});
});
