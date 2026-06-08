import * as Haptics from "expo-haptics";
import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";

// Derive the tab-bar props from expo-router itself (SDK 56 decoupled from
// @react-navigation, so there's no package to import the type from).
type TabBarProps = Parameters<
	NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

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
					<Pressable
						key={route.key}
						onPress={onPress}
						onLongPress={() =>
							navigation.emit({ type: "tabLongPress", target: route.key })
						}
						accessibilityRole="button"
						accessibilityState={{ selected: focused }}
						accessibilityLabel={label}
						className="flex-1 items-center gap-1 py-1"
					>
						<View
							className={`rounded-full px-5 py-1 ${focused ? "bg-primary/15" : ""}`}
						>
							{options.tabBarIcon?.({ focused, color: "", size: 22 })}
						</View>
						<Text
							className={`text-xs ${focused ? "text-primary font-semibold" : "text-muted-foreground"}`}
						>
							{label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}
