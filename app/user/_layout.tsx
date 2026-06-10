import { Stack } from "expo-router";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

export default function UserLayout() {
	const { colors } = useTheme();
	const { t } = useI18n();
	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: colors.background },
			}}
		>
			<Stack.Screen name="[profileUrl]/index" options={{ title: "" }} />
			<Stack.Screen
				name="[profileUrl]/followers"
				options={{ title: t("titles.followers") }}
			/>
			<Stack.Screen
				name="[profileUrl]/following"
				options={{ title: t("titles.following") }}
			/>
		</Stack>
	);
}
