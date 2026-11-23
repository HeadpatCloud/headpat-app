import { readWidgetSnapshot, refreshWidgetSnapshot } from "@/widgets/data";
import ChatsWidget from "@/widgets/ios-ui/chats-widget";
import NextEventWidget from "@/widgets/ios-ui/next-event-widget";
import { chatsProps, eventTimeline } from "@/widgets/ios-ui/props-builder";
import { readWidgetSettings } from "@/widgets/settings";

/** Redraws both widgets from the stored snapshot (no network). */
export async function redrawWidgets(): Promise<void> {
	const snapshot = readWidgetSnapshot();
	const { settings } = readWidgetSettings();
	NextEventWidget.updateTimeline(eventTimeline(snapshot, settings));
	ChatsWidget.updateSnapshot(chatsProps(snapshot, settings));
}

/** Fetches fresh data, then redraws. */
export async function refreshWidgets(): Promise<void> {
	await refreshWidgetSnapshot();
	await redrawWidgets();
}
