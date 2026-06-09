import { StyleSheet, type StyleProp, View, type ViewStyle } from "react-native";
import { Gradient } from "@/components/ui/gradient";
import { useTheme } from "@/lib/theme/provider";

type GlowBackdropProps = {
	size?: number;
	style?: StyleProp<ViewStyle>;
	className?: string;
};

// Decorative soft bloom behind heroes/headings. No real blur without expo-blur,
// so the halo is faked with a large colored shadow on a rounded-full disc plus a
// low-opacity gradient core. Callers animate opacity; this owns no motion.
export function GlowBackdrop({ size = 280, style, className }: GlowBackdropProps) {
	const { glow } = useTheme();
	const radius = size / 2;
	return (
		<View
			pointerEvents="none"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			className={className}
			style={[
				{
					width: size,
					height: size,
					borderRadius: radius,
					backgroundColor: glow,
					shadowColor: glow,
					shadowOpacity: 1,
					shadowRadius: radius * 0.9,
					shadowOffset: { width: 0, height: 0 },
					elevation: 24,
				},
				style,
			]}
		>
			<Gradient
				borderRadius={radius}
				opacity={0.5}
				style={StyleSheet.absoluteFill}
			/>
		</View>
	);
}
