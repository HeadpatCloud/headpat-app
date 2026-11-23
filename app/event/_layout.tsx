import { Stack } from "expo-router";
import { HeaderBack } from "@/components/header-back";
import { DETAIL_STACK_OPTIONS } from "@/components/header-controls";
import { useI18n } from "@/lib/i18n/provider";
import { useStackScreenOptions } from "@/lib/navigation/stack-options";

export default function EventLayout() {
	const screenOptions = useStackScreenOptions(DETAIL_STACK_OPTIONS);
	const { t } = useI18n();
	return (
		<Stack screenOptions={screenOptions}>
			<Stack.Screen
				name="[eventId]"
				options={{ title: "", headerLeft: () => <HeaderBack /> }}
			/>
			<Stack.Screen
				name="attendees/[eventId]"
				options={{ title: t("titles.eventAttendees") }}
			/>
			<Stack.Screen
				name="edit/[eventId]"
				options={{ title: t("titles.eventEdit") }}
			/>
		</Stack>
	);
}
