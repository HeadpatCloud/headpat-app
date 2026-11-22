import { Stack } from "expo-router";
import { HeaderBack } from "@/components/header-back";
import { DETAIL_STACK_OPTIONS } from "@/components/header-controls";
import { useI18n } from "@/lib/i18n/provider";
import { useStackScreenOptions } from "@/lib/navigation/stack-options";

export default function PostLayout() {
	const screenOptions = useStackScreenOptions(DETAIL_STACK_OPTIONS);
	const { t } = useI18n();
	return (
		<Stack screenOptions={screenOptions}>
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
