import { useId } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "@/lib/theme/provider";

type GlowBackdropProps = {
	size?: number;
	style?: StyleProp<ViewStyle>;
	className?: string;
};

// Decorative soft bloom behind heroes/headings. RN has no blur, so the soft
// falloff comes from an SVG radial gradient — the theme glow color in the center
// fading to fully transparent at the edge. Callers position/animate it; no motion.
export function GlowBackdrop({ size = 280, style, className }: GlowBackdropProps) {
	const { glow } = useTheme();
	const id = useId().replace(/:/g, "");
	return (
		<View
			pointerEvents="none"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			className={className}
			style={[{ width: size, height: size }, style]}
		>
			<Svg width={size} height={size}>
				<Defs>
					<RadialGradient id={id} cx="50%" cy="50%" r="50%">
						<Stop offset="0" stopColor={glow} stopOpacity={1} />
						<Stop offset="1" stopColor={glow} stopOpacity={0} />
					</RadialGradient>
				</Defs>
				<Rect x="0" y="0" width={size} height={size} fill={`url(#${id})`} />
			</Svg>
		</View>
	);
}
