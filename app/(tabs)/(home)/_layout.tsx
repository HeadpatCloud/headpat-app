import { Stack } from "expo-router";
import { HeaderControls } from "@/components/header-controls";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

// A native-stack header (not the Tabs JS header) so the top-right controls get
// the same iOS look as the other tabs. Grouped folder keeps the URL at "/".
export default function HomeLayout() {
	const { colors } = useTheme();
	const { t } = useI18n();
	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: colors.background },
				headerRight: () => <HeaderControls />,
			}}
		>
			<Stack.Screen name="index" options={{ title: t("tabs.home") }} />
		</Stack>
	);
}
