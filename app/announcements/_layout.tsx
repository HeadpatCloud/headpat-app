import { router, Stack } from "expo-router";
import { Pressable } from "react-native";
import { ChevronLeft } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
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
				options={{
					title: "",
					// Root of this nested stack, so no automatic back button.
					headerLeft: () => (
						<Pressable
							onPress={() => router.back()}
							accessibilityRole="button"
							accessibilityLabel={t("common.back")}
							hitSlop={12}
						>
							<Icon as={ChevronLeft} size={28} />
						</Pressable>
					),
				}}
			/>
			<Stack.Screen name="[announcementId]" options={{ title: "" }} />
		</Stack>
	);
}
