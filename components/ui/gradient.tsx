import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
	type StyleProp,
	View,
	type ViewProps,
	type ViewStyle,
} from "react-native";
import { withAlpha } from "@/lib/theme/color";
import { useTheme } from "@/lib/theme/provider";

type GradientProps = ViewProps & {
	// A real gradient (e.g. a scrim). Without it the fill is solid primary.
	colors?: readonly [string, string, ...string[]];
	start?: { x: number; y: number };
	end?: { x: number; y: number };
	locations?: readonly [number, number, ...number[]];
	style?: StyleProp<ViewStyle>;
	borderRadius?: number;
	opacity?: number;
	glow?: boolean;
	children?: ReactNode;
};

// CSS-spec boxShadow (New Arch): renders on both platforms and is clipped
// outside the box, so it can't bleed through transparent wrappers the way
// Android elevation did. The legacy shadow* props are deprecated.
export function GlowShadow(glow: string): ViewStyle {
	return { boxShadow: `0 8 16 ${withAlpha(glow, 0.6)}` };
}

// Brand fill. Without `colors` it paints solid primary, like the website's
// bg-primary (the app used to use a primary-to-accent gradient everywhere); with
// `colors` it is a real gradient, for washes and scrims.
export function Gradient({
	colors,
	start,
	end,
	locations,
	style,
	borderRadius,
	opacity,
	glow: _glow,
	children,
	...rest
}: GradientProps) {
	const { colors: theme } = useTheme();
	const shape = [
		borderRadius != null ? { borderRadius } : null,
		opacity != null ? { opacity } : null,
	];
	if (!colors) {
		return (
			<View
				style={[style, { backgroundColor: theme.primary }, ...shape]}
				{...rest}
			>
				{children}
			</View>
		);
	}
	return (
		<LinearGradient
			colors={colors}
			start={start ?? { x: 0, y: 0 }}
			end={end ?? { x: 1, y: 1 }}
			locations={locations}
			style={[style, ...shape]}
			{...rest}
		>
			{children}
		</LinearGradient>
	);
}
