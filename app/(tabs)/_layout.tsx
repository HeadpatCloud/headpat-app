import { Tabs } from "expo-router";
import {
	CalendarDays,
	House,
	Images,
	type LucideIcon,
	Menu,
	UsersRound,
} from "@/components/icons";
import { TabBar } from "@/components/tab-bar";
import { Icon } from "@/components/ui/icon";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

const iconFor =
	(Glyph: LucideIcon) =>
	({ focused }: { focused: boolean }) => (
		<Icon
			as={Glyph}
			size={22}
			className={focused ? "text-primary-foreground" : "text-muted-foreground"}
		/>
	);

export default function TabsLayout() {
	const { colors } = useTheme();
	const { t } = useI18n();
	return (
		<Tabs
			tabBar={(props) => <TabBar {...props} />}
			screenOptions={{
				// Every tab is a nested stack that renders its own (native) header, so
				// the Tabs JS header stays off — keeps the top-right controls consistent.
				headerShown: false,
				freezeOnBlur: true,
				sceneStyle: { backgroundColor: colors.background },
			}}
		>
			<Tabs.Screen
				name="(home)"
				options={{ title: t("tabs.home"), tabBarIcon: iconFor(House) }}
			/>
			<Tabs.Screen
				name="gallery"
				options={{ title: t("tabs.gallery"), tabBarIcon: iconFor(Images) }}
			/>
			<Tabs.Screen
				name="community"
				options={{
					title: t("tabs.community"),
					tabBarIcon: iconFor(UsersRound),
				}}
			/>
			<Tabs.Screen
				name="events"
				options={{ title: t("tabs.events"), tabBarIcon: iconFor(CalendarDays) }}
			/>
			<Tabs.Screen
				name="menu"
				options={{ title: t("tabs.menu"), tabBarIcon: iconFor(Menu) }}
			/>
		</Tabs>
	);
}
