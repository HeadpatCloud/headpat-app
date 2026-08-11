import { router, Stack } from "expo-router";
import { Pressable } from "react-native";
import { ChevronLeft } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

export default function TicketsLayout() {
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
					// Root of this nested stack: the parent (root) header is hidden, so
					// add an explicit back affordance to return to the menu.
					headerLeft: () => (
						<Pressable
							onPress={() => router.back()}
							hitSlop={8}
							accessibilityRole="button"
							accessibilityLabel={t("common.back")}
						>
							<Icon as={ChevronLeft} size={28} className="text-foreground" />
						</Pressable>
					),
				}}
			/>
			<Stack.Screen name="new" options={{ title: "" }} />
			<Stack.Screen name="[ticketId]" options={{ title: t("titles.ticket") }} />
		</Stack>
	);
}
