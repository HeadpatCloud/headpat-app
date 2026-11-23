import { useEffect, useState } from "react";
import { requestPinWidget, WidgetPreview } from "react-native-android-widget";
import { useTheme } from "@/lib/theme/provider";
import {
	type AndroidWidgetName,
	drawWidget,
} from "@/widgets/android-ui/render";
import { readWidgetSnapshot, type WidgetSnapshot } from "@/widgets/data";
import type { WidgetTheme } from "@/widgets/settings";

export const HAS_HOME_WIDGETS = true;
export const CAN_PIN_WIDGETS = true;

/** Asks the launcher to place the widget; false when it can't (some launchers). */
export function pinWidget(name: AndroidWidgetName): Promise<boolean> {
	return requestPinWidget({ widgetName: name }).catch(() => false);
}

/** The real widget, drawn by the same native code the home screen uses. */
export function WidgetLivePreview({
	name,
	theme,
	width,
	height,
	version,
}: {
	name: AndroidWidgetName;
	theme: WidgetTheme;
	width: number;
	height: number;
	/** Bump to redraw after the stored data changed. */
	version: number;
}) {
	const { scheme } = useTheme();
	const [snapshot, setSnapshot] = useState<WidgetSnapshot | null>(() =>
		readWidgetSnapshot(),
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: version is the re-read trigger
	useEffect(() => setSnapshot(readWidgetSnapshot()), [version]);
	const drawScheme = theme === "app" ? scheme : theme;
	return (
		<WidgetPreview
			key={`${drawScheme}-${version}`}
			width={width}
			height={height}
			renderWidget={() => drawWidget(name, drawScheme, height, snapshot)}
		/>
	);
}
