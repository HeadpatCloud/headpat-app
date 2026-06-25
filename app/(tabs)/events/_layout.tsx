import { Stack } from "expo-router";
import { HeaderControls } from "@/components/header-controls";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

// Anchor the list as the base of this stack so opening a detail directly (map
// callout, deep link) still has the list beneath it — the native back button
// then always returns to the list, never up to the tab root.
export const unstable_settings = { initialRouteName: "index" };

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
			<Stack.Screen name="[eventId]" options={{ title: "" }} />
			<Stack.Screen
				name="edit/[eventId]"
				options={{ title: t("titles.eventEdit") }}
			/>
		</Stack>
	);
}
