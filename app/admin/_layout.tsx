import { Stack } from "expo-router";
import { HeaderBack } from "@/components/header-back";
import { DETAIL_STACK_OPTIONS } from "@/components/header-controls";
import { useI18n } from "@/lib/i18n/provider";
import { useStackScreenOptions } from "@/lib/navigation/stack-options";

export default function AdminLayout() {
	const screenOptions = useStackScreenOptions(DETAIL_STACK_OPTIONS);
	const { t } = useI18n();
	return (
		<Stack screenOptions={screenOptions}>
			<Stack.Screen
				name="index"
				options={{
					title: "",
					// Root of this nested stack, so no automatic back button.
					headerLeft: () => <HeaderBack />,
				}}
			/>
			<Stack.Screen
				name="reports"
				options={{ title: t("titles.adminReports") }}
			/>
			<Stack.Screen
				name="tickets"
				options={{ title: t("titles.adminTickets") }}
			/>
		</Stack>
	);
}
