import * as Haptics from "expo-haptics";
import type { Tabs } from "expo-router";
import { type ComponentProps, useEffect, useState } from "react";
import { type LayoutChangeEvent, Platform, Pressable, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gradient } from "@/components/ui/gradient";
import { Text } from "@/components/ui/text";
import { springs } from "@/lib/motion/springs";
import { useReducedMotion } from "@/lib/motion/reduced-motion";

// Derive the tab-bar props from expo-router itself (SDK 56 decoupled from
// @react-navigation, so there's no package to import the type from).
type TabBarProps = Parameters<
	NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

type TabItemProps = {
	focused: boolean;
	label: string;
	icon: TabBarProps["descriptors"][string]["options"]["tabBarIcon"];
	onPress: () => void;
	onLongPress: () => void;
	onLayout: (e: LayoutChangeEvent) => void;
};

function TabItem({
	focused,
	label,
	icon,
	onPress,
	onLongPress,
	onLayout,
}: TabItemProps) {
	const reduced = useReducedMotion();
	const pop = useSharedValue(1);
	const press = useSharedValue(1);

	useEffect(() => {
		if (reduced || !focused) return;
		pop.value = withSequence(
			withTiming(1.08, { duration: 120 }),
			withSpring(1, springs.snappy),
		);
	}, [focused, reduced, pop]);

	const iconStyle = useAnimatedStyle(() => ({
		transform: [{ scale: pop.value * press.value }],
	}));

	return (
		<Pressable
			onLayout={onLayout}
			onPress={onPress}
			onLongPress={onLongPress}
			onPressIn={() => {
				if (!reduced) press.value = withSpring(0.92, springs.snappy);
			}}
			onPressOut={() => {
				if (!reduced) press.value = withSpring(1, springs.snappy);
			}}
			accessibilityRole="button"
			accessibilityState={{ selected: focused }}
			accessibilityLabel={label}
			className="flex-1 items-center gap-1 py-1"
		>
			<View className="rounded-full px-5 py-1">
				<Animated.View style={iconStyle}>
					{icon?.({ focused, color: "", size: 22 })}
				</Animated.View>
			</View>
			<Text
				className={`text-xs ${focused ? "text-primary font-semibold" : "text-muted-foreground"}`}
			>
				{label}
			</Text>
		</Pressable>
	);
}

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
	const insets = useSafeAreaInsets();
	const reduced = useReducedMotion();
	const [slots, setSlots] = useState<{ x: number; width: number }[]>([]);

	const x = useSharedValue(0);
	const width = useSharedValue(0);

	const active = slots[state.index];
	useEffect(() => {
		if (!active) return;
		if (reduced || width.value === 0) {
			x.value = active.x;
			width.value = active.width;
			return;
		}
		x.value = withSpring(active.x, springs.gentle);
		width.value = withSpring(active.width, springs.gentle);
	}, [active, reduced, x, width]);

	const pillStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: x.value }],
		width: width.value,
		opacity: width.value === 0 ? 0 : 1,
	}));

	const onSlotLayout = (index: number) => (e: LayoutChangeEvent) => {
		const { x: lx, width: lw } = e.nativeEvent.layout;
		setSlots((prev) => {
			const next = [...prev];
			next[index] = { x: lx, width: lw };
			return next;
		});
	};

	return (
		<View
			className="bg-card border-border flex-row border-t px-2 pt-2"
			style={{ paddingBottom: insets.bottom + 6 }}
		>
			<Animated.View
				pointerEvents="none"
				className="absolute left-0 items-center"
				style={[{ top: 12 }, pillStyle]}
			>
				<Gradient
					opacity={0.6}
					borderRadius={999}
					style={{ height: 30, paddingHorizontal: 20 }}
					className="rounded-full"
				/>
			</Animated.View>
			{state.routes.map((route, index) => {
				const { options } = descriptors[route.key];
				const focused = state.index === index;
				const label =
					typeof options.title === "string" ? options.title : route.name;

				const onPress = () => {
					if (Platform.OS !== "web") Haptics.selectionAsync();
					const event = navigation.emit({
						type: "tabPress",
						target: route.key,
						canPreventDefault: true,
					});
					if (!focused && !event.defaultPrevented) {
						navigation.navigate(route.name, route.params);
					}
				};

				return (
					<TabItem
						key={route.key}
						focused={focused}
						label={label}
						icon={options.tabBarIcon}
						onPress={onPress}
						onLongPress={() =>
							navigation.emit({ type: "tabLongPress", target: route.key })
						}
						onLayout={onSlotLayout(index)}
					/>
				);
			})}
		</View>
	);
}
