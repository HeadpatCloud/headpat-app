import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import type { Tabs } from "expo-router";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import {
	type LayoutChangeEvent,
	Platform,
	Pressable,
	View,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CountBadge } from "@/components/count-badge";
import { Gradient } from "@/components/ui/gradient";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { springs } from "@/lib/motion/springs";
import { orpc } from "@/lib/orpc";

// Derive the tab-bar props from expo-router itself (SDK 56 decoupled from
// @react-navigation, so there's no package to import the type from).
type TabBarProps = Parameters<
	NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

type TabItemProps = {
	focused: boolean;
	label: string;
	icon: TabBarProps["descriptors"][string]["options"]["tabBarIcon"];
	badge?: number;
	onPress: () => void;
	onLongPress: () => void;
	onLayout: (e: LayoutChangeEvent) => void;
};

function TabItem({
	focused,
	label,
	icon,
	badge = 0,
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
				<View className="absolute -top-1 right-2" pointerEvents="none">
					<CountBadge count={badge} />
				</View>
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
	const { data: session } = useSession();
	// One ambient unread query for the whole bar; errors just mean no badge.
	const unread = useQuery({
		...orpc.notification.unreadCount.queryOptions(),
		enabled: !!session,
		staleTime: 30_000,
		// Foreground-only fallback poll; push + foreground refetch keep this live,
		// so a long interval is enough and easy on the battery.
		refetchInterval: 5 * 60_000,
	});
	const unreadCount = session ? (unread.data?.count ?? 0) : 0;
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
	const activeVisibleIndex = visibleRoutes.findIndex(
		(route) => route.key === state.routes[state.index]?.key,
	);
	const slotsRef = useRef<{ x: number; width: number }[]>([]);
	const [slots, setSlots] = useState<{ x: number; width: number }[]>([]);

	const x = useSharedValue(0);
	const width = useSharedValue(0);

	const active = slots[activeVisibleIndex];
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

	// Accumulate measurements in a ref and commit ONE state update once every
	// slot is measured (and only when something actually moved) — per-item
	// setState re-rendered the whole bar 5x on mount.
	const onSlotLayout = (index: number) => (e: LayoutChangeEvent) => {
		const { x: lx, width: lw } = e.nativeEvent.layout;
		slotsRef.current[index] = { x: lx, width: lw };
		const next = slotsRef.current;
		if (next.filter(Boolean).length < visibleRoutes.length) return;
		setSlots((prev) =>
			prev.length === next.length &&
			prev.every((s, i) => s.x === next[i].x && s.width === next[i].width)
				? prev
				: [...next],
		);
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
			{visibleRoutes.map((route, index) => {
				const { options } = descriptors[route.key];
				const focused = index === activeVisibleIndex;
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
						badge={route.name === "account" ? unreadCount : 0}
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
