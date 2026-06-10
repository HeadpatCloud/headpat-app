import type { ReactNode } from "react";
import type { ViewProps } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { durations, springs } from "@/lib/motion/springs";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { entranceFor } from "@/lib/motion/stagger";

type Preset = "fade" | "fadeDown" | "fadeUp";

type AnimatedEntranceProps = ViewProps & {
	index?: number;
	preset?: Preset;
	disabled?: boolean;
	children: ReactNode;
};

const builders = { fade: FadeIn, fadeDown: FadeInDown, fadeUp: FadeInUp };

// Springy entrance with optional stagger. Falls back to a plain View when the
// item shouldn't animate, and to a quiet FadeIn under reduced motion.
export function AnimatedEntrance({
	index = 0,
	preset = "fadeDown",
	disabled,
	children,
	...rest
}: AnimatedEntranceProps) {
	const reduced = useReducedMotion();
	const plan = entranceFor(index, { reduced, disabled });

	// Host type must stay constant: swapping Animated.View <-> View when
	// `disabled` flips remounts the whole subtree (kills FlashList recycling).
	const entering = !plan.animate
		? undefined
		: reduced
			? FadeIn.duration(durations.base)
			: builders[preset]
					.springify()
					.damping(springs.gentle.damping)
					.stiffness(springs.gentle.stiffness)
					.mass(springs.gentle.mass)
					.delay(plan.delayMs);

	return (
		<Animated.View entering={entering} {...rest}>
			{children}
		</Animated.View>
	);
}
