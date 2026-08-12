import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { useI18n } from "@/lib/i18n/provider";

export function NsfwToggle({
	value,
	onValueChange,
}: {
	value: boolean;
	onValueChange: (value: boolean) => void;
}) {
	const { t } = useI18n();
	return (
		<View className="min-h-11 flex-row items-center justify-between gap-3">
			<Text variant="small" className="text-muted-foreground">
				{t("gallery.showNsfw")}
			</Text>
			<Toggle
				value={value}
				onValueChange={onValueChange}
				accessibilityLabel={t("gallery.showNsfw")}
			/>
		</View>
	);
}
