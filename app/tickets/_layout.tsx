import { Stack } from "expo-router";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

export default function TicketsLayout() {
	const { colors } = useTheme();
	const { t } = useI18n();
	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: colors.background },
			}}
		>
			<Stack.Screen name="index" options={{ title: t("titles.tickets") }} />
			<Stack.Screen name="new" options={{ title: t("titles.ticketNew") }} />
			<Stack.Screen name="[ticketId]" options={{ title: t("titles.ticket") }} />
		</Stack>
	);
}
