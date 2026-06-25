import { router, Stack } from "expo-router";
import { Pressable } from "react-native";
import { HeaderControls } from "@/components/header-controls";
import { ChevronLeft } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

export default function CommunityLayout() {
	const { colors } = useTheme();
	const { t } = useI18n();
	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: colors.background },
				headerRight: () => <HeaderControls />,
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					title: t("titles.communities"),
					// Root of this nested stack (pushed from menu/home), so no automatic
					// back button — add one that pops back to where it was opened from.
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
			<Stack.Screen name="[communityId]" options={{ title: "" }} />
			<Stack.Screen name="new" options={{ title: "", presentation: "modal" }} />
		</Stack>
	);
}
