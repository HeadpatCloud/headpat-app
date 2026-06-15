import { router, Stack } from "expo-router";
import { Pressable } from "react-native";
import { HeaderControls } from "@/components/header-controls";
import { ChevronLeft } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

export default function UserLayout() {
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
				name="[profileUrl]/index"
				options={{
					title: "",
					// Root of this nested stack, so no automatic back button — add one
					// that pops back to wherever the profile was opened from.
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
