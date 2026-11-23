import type { WidgetTheme } from "@/widgets/settings";

// Web: no home screen widgets, so the Widgets screen only offers the Home tab
// layout there.
export const HAS_HOME_WIDGETS = false;
export const CAN_PIN_WIDGETS = false;

export function pinWidget(_name: string): Promise<boolean> {
	return Promise.resolve(false);
}

export function WidgetLivePreview(_props: {
	name: string;
	theme: WidgetTheme;
	width: number;
	height: number;
	version: number;
}) {
	return null;
}
