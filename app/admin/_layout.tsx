import { Stack } from "expo-router";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

export default function AdminLayout() {
	const { colors } = useTheme();
	const { t } = useI18n();
	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: colors.background },
			}}
		>
			<Stack.Screen name="index" options={{ title: "" }} />
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
