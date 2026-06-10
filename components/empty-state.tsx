import type { LucideIcon } from "@/components/icons";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { Button } from "@/components/ui/button";
import { Gradient, GlowShadow } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { durations, springs } from "@/lib/motion/springs";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { TYPE } from "@/lib/theme/foundations";
import { useTheme } from "@/lib/theme/provider";

const HALO = 96;

type EmptyStateProps = {
	icon?: LucideIcon;
	emoji?: string;
	title: string;
	subtitle?: string;
	action?: { label: string; onPress: () => void };
};

export function EmptyState({
	icon,
	emoji,
	title,
	subtitle,
	action,
}: EmptyStateProps) {
	const { glow } = useTheme();
	const reduced = useReducedMotion();
	const enter = useSharedValue(reduced ? 1 : 0);

	useEffect(() => {
		enter.value = reduced
			? withTiming(1, { duration: durations.base })
			: withSpring(1, springs.gentle);
	}, [reduced, enter]);

	const haloStyle = useAnimatedStyle(() => ({
		opacity: enter.value,
		transform: [{ scale: reduced ? 1 : 0.9 + enter.value * 0.1 }],
	}));

	return (
		<View className="items-center justify-center gap-3 px-8 py-16">
			{icon || emoji ? (
				<Animated.View
					style={haloStyle}
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
				>
					<Gradient
						glow
						borderRadius={HALO / 2}
						opacity={0.18}
						style={[
							styles.halo,
							GlowShadow(glow),
						]}
					>
						{emoji ? (
							<Text className="text-4xl">{emoji}</Text>
						) : icon ? (
							<Icon as={icon} size={40} className="text-primary-foreground" />
						) : null}
					</Gradient>
				</Animated.View>
			) : null}
			<Text variant="large" style={TYPE.title} className="text-center">
				{title}
			</Text>
			{subtitle ? (
				<Text variant="muted" className="max-w-[280px] text-center">
					{subtitle}
				</Text>
			) : null}
			{action ? (
				<Button
					onPress={action.onPress}
					className="mt-2 overflow-hidden bg-transparent"
				>
					<Gradient style={StyleSheet.absoluteFill} />
					<Text>{action.label}</Text>
				</Button>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	halo: {
		width: HALO,
		height: HALO,
		alignItems: "center",
		justifyContent: "center",
	},
});
