import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
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
			className="bg-primary/10 flex-row rounded-full"
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
					<View
						className="bg-card"
						style={[StyleSheet.absoluteFill, styles.pill]}
					/>
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
						className="text-sm font-bold"
						style={{
							color:
								i === active ? colors.foreground : colors["muted-foreground"],
						}}
					>
						{tab.label}
					</Text>
				</PressableScale>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	pill: { boxShadow: "0 1 3 rgba(23, 51, 42, 0.12)" },
});
