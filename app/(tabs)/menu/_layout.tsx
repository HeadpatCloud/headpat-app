import { Stack } from "expo-router";
import { TAB_ROOT_OPTIONS } from "@/components/app-header";
import { useStackScreenOptions } from "@/lib/navigation/stack-options";

export default function MenuLayout() {
	const screenOptions = useStackScreenOptions();
	return (
		<Stack screenOptions={screenOptions}>
			<Stack.Screen name="index" options={TAB_ROOT_OPTIONS} />
		</Stack>
	);
}
