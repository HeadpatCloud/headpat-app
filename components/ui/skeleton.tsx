import { useEffect, useRef } from "react";
import { Animated, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";

// RN Animated (not reanimated) so it needs no babel worklet setup.
export function Skeleton({ className, style, ...props }: ViewProps) {
	const opacity = useRef(new Animated.Value(0.5)).current;

	useEffect(() => {
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(opacity, {
					toValue: 1,
					duration: 700,
					useNativeDriver: true,
				}),
				Animated.timing(opacity, {
					toValue: 0.5,
					duration: 700,
					useNativeDriver: true,
				}),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [opacity]);

	return (
		<Animated.View
			className={cn("bg-muted rounded-md", className)}
			style={[{ opacity }, style]}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			{...props}
		/>
	);
}
