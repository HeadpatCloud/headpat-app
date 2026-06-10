import { Tabs } from "expo-router";
import { HeaderControls } from "@/components/header-controls";
import {
	CalendarDays,
	House,
	Images,
	type LucideIcon,
	User,
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
				headerShown: true,
				freezeOnBlur: true,
				sceneStyle: { backgroundColor: colors.background },
				headerRight: () => <HeaderControls />,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{ title: t("tabs.home"), tabBarIcon: iconFor(House) }}
			/>
			<Tabs.Screen
				name="gallery"
				options={{
					title: t("tabs.gallery"),
					headerShown: false,
					tabBarIcon: iconFor(Images),
				}}
			/>
			<Tabs.Screen
				name="community"
				options={{
					title: t("tabs.community"),
					headerShown: false,
					tabBarIcon: iconFor(UsersRound),
				}}
			/>
			<Tabs.Screen
				name="events"
				options={{
					title: t("tabs.events"),
					headerShown: false,
					tabBarIcon: iconFor(CalendarDays),
				}}
			/>
			<Tabs.Screen
				name="account"
				options={{ title: t("tabs.account"), tabBarIcon: iconFor(User) }}
			/>
		</Tabs>
	);
}
