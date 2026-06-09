import * as Haptics from "expo-haptics";
import type { Tabs } from "expo-router";
import { type ComponentProps, useEffect } from "react";
import { Platform, Pressable, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
};

function TabItem({ focused, label, icon, onPress, onLongPress }: TabItemProps) {
	const reduced = useReducedMotion();
	const pill = useSharedValue(focused ? 1 : 0);
	const pop = useSharedValue(1);

	useEffect(() => {
		if (reduced) {
			pill.value = focused ? 1 : 0;
			return;
		}
		pill.value = withSpring(focused ? 1 : 0, springs.gentle);
		if (focused) {
			pop.value = withSequence(
				withTiming(1.08, { duration: 120 }),
				withSpring(1, springs.snappy),
			);
		}
	}, [focused, reduced, pill, pop]);

	const pillStyle = useAnimatedStyle(() => ({
		opacity: pill.value,
		transform: [{ scale: 0.85 + pill.value * 0.15 }],
	}));
	const iconStyle = useAnimatedStyle(() => ({
		transform: [{ scale: pop.value }],
	}));

	return (
		<Pressable
			onPress={onPress}
			onLongPress={onLongPress}
			accessibilityRole="button"
			accessibilityState={{ selected: focused }}
			accessibilityLabel={label}
			className="flex-1 items-center gap-1 py-1"
		>
			<View className="rounded-full px-5 py-1">
				<Animated.View
					className="bg-primary/15 absolute inset-0 rounded-full"
					style={pillStyle}
				/>
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

	return (
		<View
			className="bg-card border-border flex-row border-t px-2 pt-2"
			style={{ paddingBottom: insets.bottom + 6 }}
		>
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
					/>
				);
			})}
		</View>
	);
}
