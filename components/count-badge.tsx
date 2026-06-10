import { useEffect, useRef } from "react";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
} from "react-native-reanimated";
import { Gradient } from "@/components/ui/gradient";
import { Text } from "@/components/ui/text";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { springs } from "@/lib/motion/springs";

type CountBadgeProps = {
	count: number;
	max?: number;
};

// Numeric unread pill: springs in on 0 -> n, pulses on increments. Decorative —
// the parent control owns the accessible label.
export function CountBadge({ count, max = 99 }: CountBadgeProps) {
	const reduced = useReducedMotion();
	const scale = useSharedValue(0);
	const prev = useRef(0);

	useEffect(() => {
		const target = count > 0 ? 1 : 0;
		if (reduced) {
			scale.value = target;
		} else if (count > prev.current && prev.current > 0) {
			scale.value = withSequence(
				withSpring(1.2, springs.snappy),
				withSpring(1, springs.gentle),
			);
		} else {
			scale.value = withSpring(target, springs.gentle);
		}
		prev.current = count;
	}, [count, reduced, scale]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	if (count <= 0) return null;

	return (
		<Animated.View
			style={animatedStyle}
			pointerEvents="none"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
		>
			<Gradient
				glow
				borderRadius={9}
				style={{
					minWidth: 18,
					height: 18,
					paddingHorizontal: 5,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Text className="text-primary-foreground text-[10px] font-bold">
					{count > max ? `${max}+` : String(count)}
				</Text>
			</Gradient>
		</Animated.View>
	);
}
