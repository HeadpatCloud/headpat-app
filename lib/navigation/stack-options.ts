import type { Stack } from "expo-router";
import { type ComponentProps, createElement, useMemo } from "react";
import { HeaderBack } from "@/components/header-back";
import { FONT } from "@/lib/theme/fonts";
import { useTheme } from "@/lib/theme/provider";

type ScreenOptions = Exclude<
	NonNullable<ComponentProps<typeof Stack.Screen>["options"]>,
	(...args: never[]) => unknown
>;

// The round back button, shown whenever the stack can go back. Screens at the
// root of a nested stack pass their own headerLeft.
const renderBack = ({ canGoBack }: { canGoBack?: boolean }) =>
	canGoBack ? createElement(HeaderBack) : null;

// Shared native-header look for every stack: flat, on the page background, with
// the title in the display face like the website's headings. Memoised on the
// colours so navigators don't re-render their screens on unrelated renders.
export function useStackScreenOptions(extra?: ScreenOptions): ScreenOptions {
	const { colors } = useTheme();
	return useMemo(
		() => ({
			contentStyle: { backgroundColor: colors.background },
			headerStyle: { backgroundColor: colors.background },
			headerShadowVisible: false,
			headerTintColor: colors.foreground,
			headerTitleStyle: {
				fontFamily: FONT.display,
				fontSize: 20,
				color: colors.foreground,
			},
			headerBackButtonDisplayMode: "minimal",
			// Screens underneath the visible one stop rendering until they're shown
			// again, so app-wide changes (theme, language) only redraw what's visible.
			freezeOnBlur: true,
			// The round back button instead of the bare native arrow.
			headerLeft: renderBack,
			...extra,
		}),
		[colors.background, colors.foreground, extra],
	);
}
