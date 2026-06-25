import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
	type LayoutChangeEvent,
	StyleSheet,
	View,
	type ViewProps,
} from "react-native";
import Animated, {
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { cn } from "@/lib/utils";

export function Skeleton({ className, style, ...props }: ViewProps) {
	const reduced = useReducedMotion();
	const [width, setWidth] = useState(0);
	const progress = useSharedValue(0);

	useEffect(() => {
		if (reduced) return;
		progress.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
	}, [reduced, progress]);

	const sheenStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateX: interpolate(progress.value, [0, 1], [-width, width]) },
		],
	}));

	if (reduced) {
		return (
			<View
				className={cn("bg-muted rounded-md", className)}
				style={[{ opacity: 0.6 }, style]}
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				{...props}
			/>
		);
	}

	return (
		<View
			className={cn("bg-muted overflow-hidden rounded-md", className)}
			style={style}
			onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			{...props}
		>
			{width > 0 ? (
				<Animated.View style={[StyleSheet.absoluteFill, sheenStyle]}>
					<LinearGradient
						colors={["transparent", "rgba(255, 255, 255, 0.18)", "transparent"]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 0 }}
						style={StyleSheet.absoluteFill}
					/>
				</Animated.View>
			) : null}
		</View>
	);
}
