import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";

export default function Locations() {
	const { t } = useI18n();
	return (
		<View className="bg-background flex-1 items-center justify-center">
			<Text>{t("titles.locations")}</Text>
		</View>
	);
}
