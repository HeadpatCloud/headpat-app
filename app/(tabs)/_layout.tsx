import { Tabs } from "expo-router";
import {
	Calendar,
	House,
	LayoutPanelLeft,
	type LucideIcon,
	Menu,
	MessagesSquare,
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
			className={focused ? "text-link" : "text-muted-foreground"}
		/>
	);

// Built once at module scope so the memoised tab items keep stable props.
const ICONS = {
	home: iconFor(House),
	gallery: iconFor(LayoutPanelLeft),
	events: iconFor(Calendar),
	chat: iconFor(MessagesSquare),
	more: iconFor(Menu),
};

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
				options={{ title: t("tabs.home"), tabBarIcon: ICONS.home }}
			/>
			<Tabs.Screen
				name="gallery"
				options={{
					title: t("tabs.gallery"),
					tabBarIcon: ICONS.gallery,
				}}
			/>
			<Tabs.Screen
				name="events"
				options={{ title: t("tabs.events"), tabBarIcon: ICONS.events }}
			/>
			<Tabs.Screen
				name="chat"
				options={{
					title: t("tabs.chat"),
					tabBarIcon: ICONS.chat,
				}}
			/>
			<Tabs.Screen
				name="menu"
				options={{ title: t("tabs.more"), tabBarIcon: ICONS.more }}
			/>
		</Tabs>
	);
}
