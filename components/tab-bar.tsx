import * as Haptics from "expo-haptics";
import type { Tabs } from "expo-router";
import { type ComponentProps, memo, useCallback, useEffect } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CountBadge } from "@/components/count-badge";
import { Text } from "@/components/ui/text";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { springs } from "@/lib/motion/springs";
import { useTabBadges } from "@/lib/use-tab-badges";

// Derive the tab-bar props from expo-router itself (SDK 56 decoupled from
// @react-navigation, so there's no package to import the type from).
type TabBarProps = Parameters<
	NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

type TabIcon = TabBarProps["descriptors"][string]["options"]["tabBarIcon"];

type TabItemProps = {
	routeKey: string;
	focused: boolean;
	label: string;
	icon: TabIcon;
	badge: number;
	onPress: (routeKey: string, focused: boolean) => void;
	onLongPress: (routeKey: string) => void;
};

const TabItem = memo(function TabItem({
	routeKey,
	focused,
	label,
	icon,
	badge,
	onPress,
	onLongPress,
}: TabItemProps) {
	const reduced = useReducedMotion();
	const pop = useSharedValue(1);

	useEffect(() => {
		if (reduced || !focused) return;
		pop.value = withSequence(
			withTiming(1.08, { duration: 120 }),
			withSpring(1, springs.snappy),
		);
	}, [focused, reduced, pop]);

	const iconStyle = useAnimatedStyle(() => ({
		transform: [{ scale: pop.value }],
	}));

	return (
		<Pressable
			onPress={() => onPress(routeKey, focused)}
			onLongPress={() => onLongPress(routeKey)}
			accessibilityRole="tab"
			accessibilityState={{ selected: focused }}
			accessibilityLabel={label}
			className={`flex-1 items-center gap-0.5 rounded-2xl py-2 ${focused ? "bg-primary/15" : "active:bg-muted"}`}
		>
			<View>
				<Animated.View style={iconStyle}>
					{icon?.({ focused, color: "", size: 22 })}
				</Animated.View>
				<View className="absolute -right-3 -top-1.5" pointerEvents="none">
					<CountBadge count={badge} />
				</View>
			</View>
			<Text
				numberOfLines={1}
				className={`text-xs font-bold ${focused ? "text-link" : "text-muted-foreground"}`}
			>
				{label}
			</Text>
		</Pressable>
	);
});

// The website's mobile nav: a floating rounded card inset from the screen edges.
// It sits in the layout flow (on the page background), so screens need no extra
// bottom padding to keep their last row visible.
export function TabBar({
	state,
	descriptors,
	emitter,
	navigateToTab,
}: TabBarProps) {
	const insets = useSafeAreaInsets();
	const badges = useTabBadges();
	// expo-router marks href:null tabs with tabBarItemStyle display:'none'. This
	// custom bar iterates state.routes directly, so filter those out here.
	const visibleRoutes = state.routes.filter(
		(route) =>
			(
				descriptors[route.key].options.tabBarItemStyle as
					| { display?: string }
					| undefined
			)?.display !== "none",
	);
	const activeKey = state.routes[state.index]?.key;

	const onPress = useCallback(
		(routeKey: string, focused: boolean) => {
			if (Platform.OS !== "web") Haptics.selectionAsync();
			const event = emitter.emit({
				type: "tabPress",
				target: routeKey,
				canPreventDefault: true,
			});
			if (!focused && !event.defaultPrevented) navigateToTab(routeKey);
		},
		[emitter, navigateToTab],
	);

	const onLongPress = useCallback(
		(routeKey: string) => {
			emitter.emit({ type: "tabLongPress", target: routeKey });
		},
		[emitter],
	);

	return (
		<View
			className="bg-background px-3 pt-1"
			style={{ paddingBottom: Math.max(insets.bottom, 8) + 4 }}
		>
			<View
				className="bg-card border-border flex-row gap-1 rounded-3xl border p-2"
				style={styles.shadow}
			>
				{visibleRoutes.map((route) => {
					const { options } = descriptors[route.key];
					return (
						<TabItem
							key={route.key}
							routeKey={route.key}
							focused={route.key === activeKey}
							label={
								typeof options.title === "string" ? options.title : route.name
							}
							icon={options.tabBarIcon}
							badge={badges[route.name] ?? 0}
							onPress={onPress}
							onLongPress={onLongPress}
						/>
					);
				})}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	shadow: { boxShadow: "0 8 24 rgba(23, 51, 42, 0.12)" },
});
