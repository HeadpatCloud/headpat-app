import type { LucideIcon } from "@/components/icons";
import { useEffect } from "react";
import { Platform, type ViewStyle } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { springs } from "@/lib/motion/springs";
import { RADIUS } from "@/lib/theme/foundations";
import { useTheme } from "@/lib/theme/provider";

type FabProps = {
	icon: LucideIcon;
	onPress: () => void;
	label?: string;
	accessibilityLabel: string;
	position?: "bottom-right" | "bottom-center";
};

export function Fab({
	icon,
	onPress,
	label,
	accessibilityLabel,
	position = "bottom-right",
}: FabProps) {
	const { colors } = useTheme();
	const insets = useSafeAreaInsets();
	const reduced = useReducedMotion();
	const mount = useSharedValue(reduced ? 1 : 0);

	useEffect(() => {
		if (reduced) {
			mount.value = 1;
			return;
		}
		mount.value = withSpring(1, springs.gentle);
	}, [reduced, mount]);

	const mountStyle = useAnimatedStyle(() => ({
		transform: [{ scale: mount.value }],
	}));

	const fg = colors["primary-foreground"];
	const extended = label != null;
	const radius = extended ? RADIUS.lg : RADIUS.pill;

	const placement: ViewStyle =
		position === "bottom-center"
			? { left: 0, right: 0, alignItems: "center" }
			: { right: 16 };

	return (
		<Animated.View
			pointerEvents="box-none"
			style={[
				{ position: "absolute", bottom: insets.bottom + 72 },
				placement,
				mountStyle,
			]}
		>
			<PressableScale
				scaleTo={0.96}
				haptic="selection"
				onPress={onPress}
				accessibilityRole="button"
				accessibilityLabel={accessibilityLabel}
			>
				<Gradient
					glow
					borderRadius={radius}
					style={{
						minHeight: 56,
						minWidth: 56,
						borderRadius: radius,
						paddingHorizontal: extended ? 20 : 0,
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						gap: extended ? 8 : 0,
					}}
				>
					<Icon as={icon} size={24} color={fg} />
					{extended ? (
						<Text
							variant="large"
							style={{ color: fg }}
							className={Platform.select({ web: "select-none" })}
						>
							{label}
						</Text>
					) : null}
				</Gradient>
			</PressableScale>
		</Animated.View>
	);
}
