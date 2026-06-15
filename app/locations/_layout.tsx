import { router, Stack } from "expo-router";
import { Pressable } from "react-native";
import { ChevronLeft } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { useI18n } from "@/lib/i18n/provider";

export default function LocationsLayout() {
	const { t } = useI18n();
	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					title: t("titles.map"),
					// index is the root of this nested stack, so it gets no automatic
					// back button — add one that pops back to wherever it was opened from.
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
			<Stack.Screen
				name="share"
				options={{
					headerShown: true,
					title: t("locations.manageTitle"),
					headerBackTitle: t("common.back"),
				}}
			/>
		</Stack>
	);
}
