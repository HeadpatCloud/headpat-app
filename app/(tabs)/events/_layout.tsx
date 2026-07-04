import { Stack } from "expo-router";
import { HeaderControls } from "@/components/header-controls";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

export default function EventsLayout() {
	const { colors } = useTheme();
	const { t } = useI18n();
	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: colors.background },
				headerRight: () => <HeaderControls />,
			}}
		>
			<Stack.Screen name="index" options={{ title: t("titles.events") }} />
			<Stack.Screen name="new" options={{ title: t("titles.eventNew") }} />
		</Stack>
	);
}
