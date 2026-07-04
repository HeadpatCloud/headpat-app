import { Stack } from "expo-router";
import { HeaderBack } from "@/components/header-back";
import { HeaderControls } from "@/components/header-controls";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

export default function PostLayout() {
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
				name="[galleryId]"
				options={{ title: "", headerLeft: () => <HeaderBack /> }}
			/>
			<Stack.Screen
				name="edit/[galleryId]"
				options={{ title: t("gallery.editPost") }}
			/>
		</Stack>
	);
}
