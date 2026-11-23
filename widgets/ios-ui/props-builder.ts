import type { WidgetChats, WidgetEvent, WidgetSnapshot } from "@/widgets/data";
import type {
	ChatsWidgetProps,
	IosColors,
	IosPalette,
	NextEventWidgetProps,
} from "@/widgets/ios-ui/props";
import {
	formatEventTime,
	widgetPalette,
	widgetSchemes,
	wt,
} from "@/widgets/look";
import type { WidgetSettings } from "@/widgets/settings";

function iosPalette(scheme: "light" | "dark"): IosPalette {
	const p = widgetPalette(scheme);
	return {
		background: p.background,
		foreground: p.foreground,
		muted: p.mutedForeground,
		link: p.link,
		primary: p.primary,
		primaryForeground: p.primaryForeground,
	};
}

export function iosColors(settings: WidgetSettings): IosColors {
	const schemes = widgetSchemes(settings.theme);
	if (schemes === "system") {
		return { light: iosPalette("light"), dark: iosPalette("dark") };
	}
	const forced = iosPalette(schemes);
	return { light: forced, dark: forced };
}

function eventProps(
	ev: WidgetEvent | null,
	colors: IosColors,
	at: number,
): NextEventWidgetProps {
	const base = {
		colors,
		emptyTitle: wt("event.none"),
		emptyHint: wt("event.browse"),
	};
	if (!ev) {
		return {
			...base,
			label: wt("event.label"),
			url: "headpat://events",
			title: null,
			time: "",
			where: null,
			community: null,
		};
	}
	return {
		...base,
		label: ev.going ? wt("event.going") : wt("event.label"),
		url: `headpat://event/${ev.id}`,
		title: ev.title,
		time: formatEventTime(ev.startsAt, at),
		where:
			ev.locationText ??
			(ev.locationZoneMethod === "virtual" ? wt("event.online") : null),
		community: ev.communityName ?? null,
	};
}

function startOfNextDay(ts: number): number {
	const d = new Date(ts);
	d.setHours(24, 0, 0, 0);
	return d.getTime();
}

/**
 * Timeline for the next event widget: "Tomorrow" has to turn into "Today" at
 * midnight and into "Happening now" at the start, without the app running.
 * After the event ends the widget falls back to its empty state until the next
 * refresh brings the following event.
 */
export function eventTimeline(
	snapshot: WidgetSnapshot | null,
	settings: WidgetSettings,
	now = Date.now(),
): { date: Date; props: NextEventWidgetProps }[] {
	const colors = iosColors(settings);
	const ev = snapshot?.nextEvent ?? null;
	const times = new Set<number>([now]);
	if (ev) {
		for (
			let t = startOfNextDay(now);
			t < ev.startsAt && times.size < 8;
			t = startOfNextDay(t)
		) {
			times.add(t);
		}
		if (ev.startsAt > now) times.add(ev.startsAt);
	}
	const entries = [...times]
		.sort((a, b) => a - b)
		.map((t) => ({ date: new Date(t), props: eventProps(ev, colors, t) }));
	const end = ev ? (ev.endsAt ?? ev.startsAt + 3 * 3_600_000) : null;
	if (end && end > now) {
		entries.push({ date: new Date(end), props: eventProps(null, colors, end) });
	}
	return entries;
}

export function chatsProps(
	snapshot: WidgetSnapshot | null,
	settings: WidgetSettings,
): ChatsWidgetProps {
	const chats: WidgetChats | null = snapshot?.chats ?? null;
	const count = chats?.conversations ?? 0;
	return {
		colors: iosColors(settings),
		label: wt("chats.label"),
		url: snapshot?.signedIn ? "headpat://chat" : "headpat://login",
		signedIn: !!snapshot?.signedIn && !!chats,
		signInText: wt("chats.signIn"),
		count,
		countLabel: wt("chats.unreadChats", { count }),
		messagesLabel: wt("chats.unreadMessages", { count: chats?.messages ?? 0 }),
		emptyTitle: wt("chats.caughtUp"),
		emptyHint: wt("chats.noUnread"),
		// Rows show who wrote and what, so they only appear with previews on.
		rows: settings.chats.showPreviews
			? (chats?.items ?? []).map((c) => ({
					title: c.title ?? c.preview?.sender ?? wt("chats.someone"),
					text: c.preview
						? (c.preview.text ?? wt("chats.attachment"))
						: wt("chats.unreadMessages", { count: c.unread }),
					unread: c.unread > 99 ? "99+" : String(c.unread),
					url: `headpat://chat/${c.id}`,
				}))
			: [],
	};
}
