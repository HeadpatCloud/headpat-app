import { Stack } from "expo-router";
import { HeaderControls } from "@/components/header-controls";
import { useI18n } from "@/lib/i18n/provider";

export default function LocationsLayout() {
	const { t } = useI18n();
	return (
		<Stack screenOptions={{ headerRight: () => <HeaderControls /> }}>
			{/* index is a bottom-bar tab root — no back button. */}
			<Stack.Screen
				name="index"
				options={{ headerShown: true, title: t("titles.map") }}
			/>
			<Stack.Screen
				name="share"
				options={{
					headerShown: true,
					title: t("locations.manageTitle"),
					headerBackTitle: t("common.back"),
				}}
			/>
		</Stack>
	);
}
