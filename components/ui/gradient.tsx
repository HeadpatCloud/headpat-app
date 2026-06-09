import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";
import { useTheme } from "@/lib/theme/provider";

type GradientProps = ViewProps & {
	// Override the theme gradient (e.g. a low-opacity wash). Defaults to the
	// active theme's primary -> accent.
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

export function GlowShadow(glow: string): ViewStyle {
	return {
		shadowColor: glow,
		shadowOpacity: 0.6,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 8 },
		elevation: 8,
	};
}

export function Gradient({
	colors,
	start,
	end,
	locations,
	style,
	borderRadius,
	opacity,
	glow,
	children,
	...rest
}: GradientProps) {
	const { gradient, glow: glowColor } = useTheme();
	if (!glow) {
		return (
			<LinearGradient
				colors={colors ?? gradient.colors}
				start={start ?? gradient.start ?? { x: 0, y: 0 }}
				end={end ?? gradient.end ?? { x: 1, y: 1 }}
				locations={locations}
				style={[
					style,
					borderRadius != null ? { borderRadius } : null,
					opacity != null ? { opacity } : null,
				]}
				{...rest}
			>
				{children}
			</LinearGradient>
		);
	}
	// Glow needs a colored shadow on a sized box. expo-linear-gradient won't cast
	// it cleanly, so the wrapper owns layout (style) + shadow and the gradient
	// paints behind the children as an absolute fill.
	return (
		<View
			style={[
				style,
				GlowShadow(glowColor),
				borderRadius != null ? { borderRadius } : null,
			]}
			{...rest}
		>
			<LinearGradient
				colors={colors ?? gradient.colors}
				start={start ?? gradient.start ?? { x: 0, y: 0 }}
				end={end ?? gradient.end ?? { x: 1, y: 1 }}
				locations={locations}
				style={[
					StyleSheet.absoluteFill,
					borderRadius != null ? { borderRadius } : null,
					opacity != null ? { opacity } : null,
				]}
			/>
			{children}
		</View>
	);
}
