import { router, Stack } from "expo-router";
import { Pressable } from "react-native";
import { HeaderBack } from "@/components/header-back";
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
				name="[communityId]"
				options={{ title: "", headerLeft: () => <HeaderBack /> }}
			/>
			<Stack.Screen name="new" options={{ title: "", presentation: "modal" }} />
		</Stack>
	);
}
