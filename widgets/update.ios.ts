import { readWidgetSnapshot, refreshWidgetSnapshot } from "@/widgets/data";
import { chatsProps, eventTimeline } from "@/widgets/ios-ui/props-builder";
import { readWidgetSettings } from "@/widgets/settings";

type IosWidgets = {
	NextEventWidget: typeof import("@/widgets/ios-ui/next-event-widget").default;
	ChatsWidget: typeof import("@/widgets/ios-ui/chats-widget").default;
};

let loaded: IosWidgets | null | undefined;

/**
 * Loads the widget definitions on first use instead of at import. Creating a
 * widget writes to the App Group's native storage, and this module is imported
 * at launch (via the background task), so a failure there used to stop the app
 * from starting. Now it only means the widgets don't update.
 */
function widgets(): IosWidgets | null {
	if (loaded !== undefined) return loaded;
	try {
		loaded = {
			NextEventWidget: (
				require("@/widgets/ios-ui/next-event-widget") as typeof import("@/widgets/ios-ui/next-event-widget")
			).default,
			ChatsWidget: (
				require("@/widgets/ios-ui/chats-widget") as typeof import("@/widgets/ios-ui/chats-widget")
			).default,
		};
	} catch (e) {
		console.warn("[widgets] could not load the iOS widgets", e);
		loaded = null;
	}
	return loaded;
}

/** Redraws both widgets from the stored snapshot (no network). */
export async function redrawWidgets(): Promise<void> {
	const w = widgets();
	if (!w) return;
	const snapshot = readWidgetSnapshot();
	const { settings } = readWidgetSettings();
	w.NextEventWidget.updateTimeline(eventTimeline(snapshot, settings));
	w.ChatsWidget.updateSnapshot(chatsProps(snapshot, settings));
}

/** Fetches fresh data, then redraws. */
export async function refreshWidgets(): Promise<void> {
	await refreshWidgetSnapshot();
	await redrawWidgets();
}
