import { Image, type StyleProp, View, type ViewStyle } from "react-native";
import { useTheme } from "@/lib/theme/provider";

type GlowBackdropProps = {
	size?: number;
	style?: StyleProp<ViewStyle>;
	className?: string;
};

// Decorative soft bloom behind heroes/headings. A tinted radial-alpha PNG, not
// an SVG radial gradient — react-native-svg gradients render banded/clipped on
// some devices. Callers position/animate it; no motion here.
export function GlowBackdrop({ size = 280, style, className }: GlowBackdropProps) {
	const { glow } = useTheme();
	const m = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(glow);
	const tint = m
		? `#${[m[1], m[2], m[3]]
				.map((v) => Number(v).toString(16).padStart(2, "0"))
				.join("")}`
		: glow;
	const alpha = m ? Number(m[4]) : 1;
	return (
		<View
			pointerEvents="none"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			className={className}
			style={[{ width: size, height: size }, style]}
		>
			<Image
				source={require("../../assets/images/glow-bloom.png")}
				style={{ width: size, height: size, opacity: alpha, tintColor: tint }}
			/>
		</View>
	);
}
