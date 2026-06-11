import { Stack } from "expo-router";
import { HeaderControls } from "@/components/header-controls";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

export default function CommunityLayout() {
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
				options={{
					title: t("titles.communities"),
					headerRight: () => <HeaderControls />,
				}}
			/>
			<Stack.Screen name="[communityId]" options={{ title: "" }} />
			<Stack.Screen name="new" options={{ title: "", presentation: "modal" }} />
		</Stack>
	);
}
