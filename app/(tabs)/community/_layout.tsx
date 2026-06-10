import { Stack } from "expo-router";
import { HeaderControls } from "@/components/header-controls";
import { useTheme } from "@/lib/theme/provider";

export default function CommunityLayout() {
	const { colors } = useTheme();
	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: colors.background },
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					// screens render their own display headers (spec §9)
					title: "",
					headerRight: () => <HeaderControls />,
				}}
			/>
			<Stack.Screen name="[communityId]" options={{ title: "" }} />
			<Stack.Screen name="new" options={{ title: "", presentation: "modal" }} />
		</Stack>
	);
}
