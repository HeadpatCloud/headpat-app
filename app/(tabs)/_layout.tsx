import { Tabs } from "expo-router";
import {
	CalendarDays,
	House,
	Images,
	User,
	UsersRound,
} from "lucide-react-native";

export default function TabsLayout() {
	return (
		<Tabs screenOptions={{ headerShown: true }}>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
				}}
			/>
			<Tabs.Screen
				name="gallery"
				options={{
					title: "Gallery",
					headerShown: false,
					tabBarIcon: ({ color, size }) => <Images color={color} size={size} />,
				}}
			/>
			<Tabs.Screen
				name="community"
				options={{
					title: "Community",
					headerShown: false,
					tabBarIcon: ({ color, size }) => (
						<UsersRound color={color} size={size} />
					),
				}}
			/>
			<Tabs.Screen
				name="events"
				options={{
					title: "Events",
					headerShown: false,
					tabBarIcon: ({ color, size }) => (
						<CalendarDays color={color} size={size} />
					),
				}}
			/>
			<Tabs.Screen
				name="account"
				options={{
					title: "Account",
					tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
				}}
			/>
		</Tabs>
	);
}
