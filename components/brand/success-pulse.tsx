import { Check } from "lucide-react-native";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { springs } from "@/lib/motion/springs";
import { useTheme } from "@/lib/theme/provider";

type SuccessPulseProps = {
	size?: number;
};

export function SuccessPulse({ size = 72 }: SuccessPulseProps) {
	const { colors } = useTheme();
	const reduced = useReducedMotion();
	const fg = colors["primary-foreground"];

	const mount = useSharedValue(reduced ? 1 : 0);
	const ring = useSharedValue(reduced ? 1 : 0);

	useEffect(() => {
		if (reduced) {
			mount.value = 1;
			ring.value = 1;
			return;
		}
		mount.value = withSpring(1, springs.gentle);
		ring.value = withTiming(1, { duration: 600 });
	}, [reduced, mount, ring]);

	const circleStyle = useAnimatedStyle(() => ({
		transform: [{ scale: mount.value }],
	}));

	// One expanding, fading ring on mount. Static (hidden) under reduced motion.
	const ringStyle = useAnimatedStyle(() => ({
		opacity: reduced ? 0 : 0.5 * (1 - ring.value),
		transform: [{ scale: 1 + ring.value * 0.6 }],
	}));

	return (
		<View
			style={{
				width: size,
				height: size,
				alignItems: "center",
				justifyContent: "center",
			}}
			accessibilityRole="image"
			accessibilityLabel="Success"
		>
			<Animated.View
				pointerEvents="none"
				style={[
					StyleSheet.absoluteFill,
					{ borderRadius: size / 2 },
					ringStyle,
				]}
			>
				<Gradient
					borderRadius={size / 2}
					style={StyleSheet.absoluteFill}
					pointerEvents="none"
				/>
			</Animated.View>
			<Animated.View style={circleStyle}>
				<Gradient
					glow
					borderRadius={size / 2}
					style={{
						width: size,
						height: size,
						borderRadius: size / 2,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Icon as={Check} size={Math.round(size * 0.44)} color={fg} />
				</Gradient>
			</Animated.View>
		</View>
	);
}
