import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import {
	Platform,
	Pressable,
	type PressableProps,
	type StyleProp,
	type ViewStyle,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { springs } from "@/lib/motion/springs";
import { useReducedMotion } from "@/lib/motion/reduced-motion";

type PressableScaleProps = Omit<PressableProps, "style" | "children"> & {
	scaleTo?: number;
	haptic?: "light" | "selection" | false;
	style?: StyleProp<ViewStyle>;
	children: ReactNode;
};

// Standard tappable: presses scale to 0.96 (snappy spring) with a light haptic.
// The visual scale lives on an inner Animated.View; the Pressable owns presses.
export function PressableScale({
	scaleTo = 0.96,
	haptic = "light",
	onPressIn,
	onPressOut,
	style,
	children,
	...rest
}: PressableScaleProps) {
	const reduced = useReducedMotion();
	const scale = useSharedValue(1);
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const fireHaptic = () => {
		if (haptic === false || Platform.OS === "web") return;
		if (haptic === "selection") Haptics.selectionAsync();
		else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
	};

	return (
		<Pressable
			onPressIn={(e) => {
				fireHaptic();
				if (!reduced) scale.value = withSpring(scaleTo, springs.snappy);
				onPressIn?.(e);
			}}
			onPressOut={(e) => {
				if (!reduced) scale.value = withSpring(1, springs.snappy);
				onPressOut?.(e);
			}}
			{...rest}
		>
			<Animated.View style={[!reduced && animatedStyle, style]}>
				{children}
			</Animated.View>
		</Pressable>
	);
}
