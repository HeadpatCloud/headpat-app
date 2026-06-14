import { Stack } from "expo-router";
import { useI18n } from "@/lib/i18n/provider";

export default function LocationsLayout() {
	const { t } = useI18n();
	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{ headerShown: true, title: t("titles.locations") }}
			/>
			<Stack.Screen
				name="share"
				options={{ headerShown: true, title: t("locations.manageTitle") }}
			/>
		</Stack>
	);
}
