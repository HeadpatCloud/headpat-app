import { requestWidgetUpdate } from "react-native-android-widget";
import { ANDROID_WIDGETS, renderWidget } from "@/widgets/android-ui/render";
import { readWidgetSnapshot, refreshWidgetSnapshot } from "@/widgets/data";

/** Redraws every placed widget from the stored snapshot (no network). */
export async function redrawWidgets(): Promise<void> {
	const snapshot = readWidgetSnapshot();
	await Promise.all(
		ANDROID_WIDGETS.map((widgetName) =>
			requestWidgetUpdate({
				widgetName,
				renderWidget: (info) => renderWidget(info, snapshot),
			}),
		),
	);
}

/** Fetches fresh data, then redraws. */
export async function refreshWidgets(): Promise<void> {
	await refreshWidgetSnapshot();
	await redrawWidgets();
}
