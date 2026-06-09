import { Tabs } from "expo-router";
import {
	CalendarDays,
	House,
	Images,
	type LucideIcon,
	User,
	UsersRound,
} from "lucide-react-native";
import { TabBar } from "@/components/tab-bar";
import { Icon } from "@/components/ui/icon";

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
	return (
		<Tabs
			tabBar={(props) => <TabBar {...props} />}
			screenOptions={{ headerShown: true }}
		>
			<Tabs.Screen
				name="index"
				options={{ title: "Home", tabBarIcon: iconFor(House) }}
			/>
			<Tabs.Screen
				name="gallery"
				options={{
					title: "Gallery",
					headerShown: false,
					tabBarIcon: iconFor(Images),
				}}
			/>
			<Tabs.Screen
				name="community"
				options={{
					title: "Community",
					headerShown: false,
					tabBarIcon: iconFor(UsersRound),
				}}
			/>
			<Tabs.Screen
				name="events"
				options={{
					title: "Events",
					headerShown: false,
					tabBarIcon: iconFor(CalendarDays),
				}}
			/>
			<Tabs.Screen
				name="account"
				options={{ title: "Account", tabBarIcon: iconFor(User) }}
			/>
		</Tabs>
	);
}
