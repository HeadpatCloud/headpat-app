import { LinearGradient } from "expo-linear-gradient";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "@/lib/theme/provider";

type AuroraProps = {
	style?: StyleProp<ViewStyle>;
};

function hexToRgba(hex: string, alpha: number): string {
	const m = /^#?([0-9a-f]{6})$/i.exec(hex);
	if (!m) return `rgba(0, 0, 0, ${alpha})`;
	const int = Number.parseInt(m[1], 16);
	return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}

// Decorative full-bleed backdrop: a soft diagonal wash with a faint primary
// tint in the top-left corner fading through the background to a faint accent
// tint bottom-right. Native expo-linear-gradient — smooth (no SVG raster), no
// animation, so it stays crisp and cheap on older devices.
export function Aurora({ style }: AuroraProps) {
	const { gradient } = useTheme();
	const [primary, accent] = gradient.colors;
	return (
		<View
			pointerEvents="none"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={[StyleSheet.absoluteFill, style]}
		>
			<LinearGradient
				colors={[
					hexToRgba(primary, 0.2),
					"transparent",
					"transparent",
					hexToRgba(accent, 0.16),
				]}
				locations={[0, 0.42, 0.58, 1]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={StyleSheet.absoluteFill}
			/>
		</View>
	);
}
