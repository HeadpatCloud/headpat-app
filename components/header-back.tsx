import { router } from "expo-router";
import { Pressable } from "react-native";
import { ChevronLeft } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { useI18n } from "@/lib/i18n/provider";

export function HeaderBack() {
	const { t } = useI18n();
	return (
		<Pressable
			onPress={() => router.back()}
			accessibilityRole="button"
			accessibilityLabel={t("common.back")}
			hitSlop={12}
		>
			<Icon as={ChevronLeft} size={28} />
		</Pressable>
	);
}
