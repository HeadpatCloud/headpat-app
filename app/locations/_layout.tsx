import { Stack } from "expo-router";
import { HeaderBack } from "@/components/header-back";
import { useI18n } from "@/lib/i18n/provider";
import { useStackScreenOptions } from "@/lib/navigation/stack-options";

const renderBack = () => <HeaderBack />;

// The map is opened from Home and More (it has no tab, like on the website), so
// its root screen needs its own back button.
export default function LocationsLayout() {
	const screenOptions = useStackScreenOptions();
	const { t } = useI18n();
	return (
		<Stack screenOptions={screenOptions}>
			<Stack.Screen
				name="index"
				options={{ title: t("titles.map"), headerLeft: renderBack }}
			/>
			<Stack.Screen name="nearby" options={{ title: t("titles.nearby") }} />
			<Stack.Screen
				name="share"
				options={{ title: t("locations.manageTitle") }}
			/>
		</Stack>
	);
}
