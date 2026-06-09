import * as Haptics from "expo-haptics";
import { Platform, Pressable, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { Gradient } from "@/components/ui/gradient";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { springs } from "@/lib/motion/springs";

const TRACK_W = 52;
const TRACK_H = 32;
const KNOB = 28;
const TRAVEL = TRACK_W - KNOB - 4; // 4 = 2pt padding each side

export function Toggle({
	value,
	onValueChange,
	accessibilityLabel,
}: {
	value: boolean;
	onValueChange: (v: boolean) => void;
	accessibilityLabel?: string;
}) {
	const reduced = useReducedMotion();
	const x = useSharedValue(value ? TRAVEL : 0);
	x.value = reduced ? (value ? TRAVEL : 0) : withSpring(value ? TRAVEL : 0, springs.gentle);

	const knobStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: x.value }],
	}));

	const onPress = () => {
		if (Platform.OS !== "web") Haptics.selectionAsync();
		onValueChange(!value);
	};

	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="switch"
			accessibilityState={{ checked: value }}
			accessibilityLabel={accessibilityLabel}
			className="items-center justify-center"
			style={{ minWidth: 44, minHeight: 44 }}
		>
			<View
				className={value ? "" : "bg-muted"}
				style={{
					width: TRACK_W,
					height: TRACK_H,
					borderRadius: TRACK_H / 2,
					padding: 2,
					justifyContent: "center",
					overflow: "hidden",
				}}
			>
				{value ? (
					<Gradient
						glow
						borderRadius={TRACK_H / 2}
						style={{ position: "absolute", inset: 0 }}
					/>
				) : null}
				<Animated.View
					className="bg-white shadow"
					style={[
						{ width: KNOB, height: KNOB, borderRadius: KNOB / 2 },
						knobStyle,
					]}
				/>
			</View>
		</Pressable>
	);
}
