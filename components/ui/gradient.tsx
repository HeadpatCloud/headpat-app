import { LinearGradient } from "expo-linear-gradient";
import type { ViewProps } from "react-native";
import { useTheme } from "@/lib/theme/provider";

type GradientProps = ViewProps & {
	// Override the theme gradient (e.g. a low-opacity wash). Defaults to the
	// active theme's primary -> accent.
	colors?: readonly [string, string, ...string[]];
	start?: { x: number; y: number };
	end?: { x: number; y: number };
};

export function Gradient({
	colors,
	start,
	end,
	style,
	children,
	...rest
}: GradientProps) {
	const { gradient } = useTheme();
	return (
		<LinearGradient
			colors={colors ?? gradient.colors}
			start={start ?? gradient.start}
			end={end ?? gradient.end}
			style={style}
			{...rest}
		>
			{children}
		</LinearGradient>
	);
}
