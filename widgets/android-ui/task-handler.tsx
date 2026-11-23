import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { renderWidget } from "@/widgets/android-ui/render";
import { readWidgetSnapshot, refreshWidgetSnapshot } from "@/widgets/data";

/**
 * Runs headless when the launcher adds, resizes or periodically updates a
 * widget. Draws the stored snapshot straight away, then fetches fresh data and
 * draws again, so the widget is never empty while the network is slow.
 */
export async function widgetTaskHandler({
	widgetInfo,
	widgetAction,
	renderWidget: draw,
}: WidgetTaskHandlerProps): Promise<void> {
	if (widgetAction === "WIDGET_DELETED" || widgetAction === "WIDGET_CLICK")
		return;
	draw(renderWidget(widgetInfo, readWidgetSnapshot()));
	if (widgetAction === "WIDGET_RESIZED") return;
	const fresh = await refreshWidgetSnapshot();
	draw(renderWidget(widgetInfo, fresh));
}
