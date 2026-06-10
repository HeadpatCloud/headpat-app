import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { Gradient } from "@/components/ui/gradient";
import { Text } from "@/components/ui/text";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { springs } from "@/lib/motion/springs";
import { RADIUS } from "@/lib/theme/foundations";
import { useTheme } from "@/lib/theme/provider";

const PAD = 4;

type Tab = { key: string; label: string };

export function SegmentedTabs({
	tabs,
	value,
	onChange,
}: {
	tabs: Tab[];
	value: string;
	onChange: (key: string) => void;
}) {
	const { colors } = useTheme();
	const reduced = useReducedMotion();
	const [width, setWidth] = useState(0);
	const active = Math.max(
		tabs.findIndex((tab) => tab.key === value),
		0,
	);
	const tabWidth = width > 0 ? (width - PAD * 2) / tabs.length : 0;
	const x = useSharedValue(0);

	useEffect(() => {
		const target = active * tabWidth;
		x.value = reduced ? target : withSpring(target, springs.gentle);
	}, [active, tabWidth, reduced, x]);

	const indicatorStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: x.value }],
	}));

	return (
		<View
			className="bg-muted flex-row rounded-full"
			style={{ padding: PAD }}
			onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
			accessibilityRole="tablist"
		>
			{tabWidth > 0 ? (
				<Animated.View
					pointerEvents="none"
					style={[
						{
							position: "absolute",
							top: PAD,
							bottom: PAD,
							left: PAD,
							width: tabWidth,
							borderRadius: RADIUS.pill,
							overflow: "hidden",
						},
						indicatorStyle,
					]}
				>
					<Gradient style={StyleSheet.absoluteFill} />
				</Animated.View>
			) : null}
			{tabs.map((tab, i) => (
				<PressableScale
					key={tab.key}
					onPress={() => onChange(tab.key)}
					haptic="selection"
					accessibilityRole="tab"
					accessibilityState={{ selected: i === active }}
					accessibilityLabel={tab.label}
					className="flex-1"
					style={{
						width: "100%",
						minHeight: 44,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Text
						className="text-sm font-semibold"
						style={{
							color:
								i === active
									? colors["primary-foreground"]
									: colors["muted-foreground"],
						}}
					>
						{tab.label}
					</Text>
				</PressableScale>
			))}
		</View>
	);
}
