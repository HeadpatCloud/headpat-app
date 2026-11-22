import { Stack } from "expo-router";
import { TAB_ROOT_OPTIONS } from "@/components/app-header";
import { useI18n } from "@/lib/i18n/provider";
import { useStackScreenOptions } from "@/lib/navigation/stack-options";

export default function EventsLayout() {
	const screenOptions = useStackScreenOptions();
	const { t } = useI18n();
	return (
		<Stack screenOptions={screenOptions}>
			<Stack.Screen name="index" options={TAB_ROOT_OPTIONS} />
			<Stack.Screen name="new" options={{ title: t("titles.eventNew") }} />
		</Stack>
	);
}
