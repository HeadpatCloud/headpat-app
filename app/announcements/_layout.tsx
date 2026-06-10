import { Stack } from "expo-router";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

export default function AnnouncementsLayout() {
	const { colors } = useTheme();
	const { t } = useI18n();
	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: colors.background },
			}}
		>
			<Stack.Screen
				name="index"
				options={{ title: t("titles.announcements") }}
			/>
			<Stack.Screen name="[announcementId]" options={{ title: "" }} />
		</Stack>
	);
}
