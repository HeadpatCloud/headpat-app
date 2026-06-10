import { useEffect } from "react";
import type * as React from "react";
import { TextInput, type TextInputProps, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { GlowShadow } from "@/components/ui/gradient";
import { Text } from "@/components/ui/text";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { durations } from "@/lib/motion/springs";
import { useTheme } from "@/lib/theme/provider";
import { cn } from "@/lib/utils";

type InputProps = TextInputProps &
	React.RefAttributes<TextInput> & {
		error?: string;
		containerClassName?: string;
	};

function Input({
	className,
	containerClassName,
	error,
	onFocus,
	onBlur,
	ref,
	...props
}: InputProps) {
	const { colors } = useTheme();
	const reduced = useReducedMotion();
	const focus = useSharedValue(0);
	const hasError = typeof error === "string" && error.length > 0;

	useEffect(() => {
		if (hasError) {
			focus.value = reduced ? 1 : withTiming(1, { duration: durations.fast });
		}
	}, [hasError, reduced, focus]);

	const ringColor = hasError ? colors.destructive : colors.ring;
	const ringStyle = useAnimatedStyle(() => ({ opacity: focus.value }));

	return (
		<View className={cn("gap-1.5", containerClassName)}>
			<View className="relative justify-center">
				<TextInput
					ref={ref}
					className={cn(
						"border-input bg-background text-foreground h-12 rounded-xl border px-3 text-base",
						props.editable === false && "opacity-50",
						className,
					)}
					placeholderTextColor={colors["muted-foreground"]}
					aria-invalid={hasError || undefined}
					onFocus={(e) => {
						if (!hasError) {
							focus.value = reduced
								? 1
								: withTiming(1, { duration: durations.fast });
						}
						onFocus?.(e);
					}}
					onBlur={(e) => {
						if (!hasError) {
							focus.value = reduced
								? 0
								: withTiming(0, { duration: durations.fast });
						}
						onBlur?.(e);
					}}
					{...props}
				/>
				<Animated.View
					pointerEvents="none"
					className="absolute inset-0 rounded-xl border-2"
					style={[{ borderColor: ringColor }, GlowShadow(ringColor), ringStyle]}
				/>
			</View>
			{hasError ? (
				<Text variant="small" className="text-destructive px-1">
					{error}
				</Text>
			) : null}
		</View>
	);
}

export { Input };
export type { InputProps };
