import { Stack } from "expo-router";
import { HeaderControls } from "@/components/header-controls";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

export default function GalleryLayout() {
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
				// the screen renders its own display header (spec §8)
				options={{ title: "" }}
			/>
			<Stack.Screen name="[galleryId]" options={{ title: "" }} />
			<Stack.Screen
				name="edit/[galleryId]"
				options={{ title: t("gallery.editPost") }}
			/>
			<Stack.Screen
				name="upload"
				options={{ title: t("titles.galleryUpload"), presentation: "modal" }}
			/>
		</Stack>
	);
}
