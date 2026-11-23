import type { WidgetTheme } from "@/widgets/settings";

// iOS has the widgets (WidgetKit, see widgets/ios-ui), but no in-app preview of
// them and no way for an app to place one: people add them from the home screen.
export const HAS_HOME_WIDGETS = true;
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
