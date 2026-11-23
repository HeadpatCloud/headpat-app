import type { client } from "@/lib/orpc";

export type Conversation = Awaited<
	ReturnType<typeof client.message.myConversations>
>["items"][number];
export type ChatMessage = Awaited<
	ReturnType<typeof client.message.list>
>[number];
export type Person = Conversation["others"][number];
// A community channel and its messages, which carry their author with them.
export type Channel = Awaited<
	ReturnType<typeof client.channel.listByCommunity>
>[number];
export type ChannelMessage = Awaited<
	ReturnType<typeof client.channel.messages>
>[number];

export const MESSAGE_PAGE = 40;

export function personName(p: {
	displayName?: string | null;
	name?: string | null;
	profileUrl?: string | null;
}): string {
	return p.displayName || p.name || p.profileUrl || "";
}

// Group name, else the other people's names, like the website's sidebar.
export function conversationTitle(
	c: Pick<Conversation, "name" | "others">,
	fallback: string,
): string {
	if (c.name?.trim()) return c.name.trim();
	const names = c.others.map(personName).filter(Boolean);
	return names.length ? names.join(", ") : fallback;
}

const sameDay = (a: Date, b: Date) =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate();

const pad = (n: number) => String(n).padStart(2, "0");

// The time for today, else a numeric date: "14.11", or "14.11.25" outside the
// current year. Built by hand because Hermes' Intl drops parts of short dates.
export function shortTime(value: Date | string, locale: string): string {
	const d = new Date(value);
	const now = new Date();
	if (sameDay(d, now)) return clockTime(d, locale);
	const date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
	return d.getFullYear() === now.getFullYear()
		? date
		: `${date}.${pad(d.getFullYear() % 100)}`;
}

export function clockTime(value: Date | string, locale: string): string {
	return new Date(value).toLocaleTimeString(locale, {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function dayLabel(
	value: Date | string,
	locale: string,
	words: { today: string; yesterday: string },
): string {
	const d = new Date(value);
	const now = new Date();
	if (sameDay(d, now)) return words.today;
	const y = new Date(now);
	y.setDate(now.getDate() - 1);
	if (sameDay(d, y)) return words.yesterday;
	return d.toLocaleDateString(locale, {
		weekday: "long",
		day: "numeric",
		month: "long",
	});
}
