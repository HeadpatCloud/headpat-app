import { Stack } from "expo-router";
import { TAB_ROOT_OPTIONS } from "@/components/app-header";
import { useStackScreenOptions } from "@/lib/navigation/stack-options";

// Grouped folder keeps the URL at "/".
export default function HomeLayout() {
	const screenOptions = useStackScreenOptions();
	return (
		<Stack screenOptions={screenOptions}>
			<Stack.Screen name="index" options={TAB_ROOT_OPTIONS} />
		</Stack>
	);
}
