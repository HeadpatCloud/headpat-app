import type {
	WidgetInfo,
	WidgetRepresentation,
} from "react-native-android-widget";
import { ChatsWidget } from "@/widgets/android-ui/chats-widget";
import { NextEventWidget } from "@/widgets/android-ui/next-event-widget";
import type { WidgetSnapshot } from "@/widgets/data";
import { widgetPalette, widgetSchemes } from "@/widgets/look";
import { readWidgetSettings } from "@/widgets/settings";

/** Names match the `widgets` entries of the config plugin in app.config.ts. */
export const ANDROID_WIDGETS = ["NextEvent", "Chats"] as const;
export type AndroidWidgetName = (typeof ANDROID_WIDGETS)[number];

export function drawWidget(
	name: AndroidWidgetName,
	scheme: "light" | "dark",
	height: number,
	snapshot: WidgetSnapshot | null,
) {
	if (name === "Chats") {
		return (
			<ChatsWidget
				snapshot={snapshot}
				palette={widgetPalette(scheme)}
				height={height}
				showPreviews={readWidgetSettings().settings.chats.showPreviews}
			/>
		);
	}
	return (
		<NextEventWidget
			snapshot={snapshot}
			palette={widgetPalette(scheme)}
			height={height}
		/>
	);
}

export function renderWidget(
	info: WidgetInfo,
	snapshot: WidgetSnapshot | null,
): WidgetRepresentation {
	const name = info.widgetName as AndroidWidgetName;
	const { settings } = readWidgetSettings();
	const schemes = widgetSchemes(settings.theme);
	const draw = (scheme: "light" | "dark") =>
		drawWidget(name, scheme, info.height, snapshot);
	if (schemes === "system") return { light: draw("light"), dark: draw("dark") };
	return draw(schemes);
}
