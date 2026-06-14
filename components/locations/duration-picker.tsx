import DateTimePicker, {
	DateTimePickerAndroid,
	type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import {
	DURATION_PRESETS,
	type DurationPreset,
	expiresAtFromCustom,
	expiresAtFromPreset,
} from "@/lib/location/durations";

export function DurationPicker({
	onChange,
}: {
	onChange: (expiresAt: string | null, label: string) => void;
}) {
	const { t } = useI18n();
	const [custom, setCustom] = useState<Date | null>(null);

	const pickPreset = (p: DurationPreset) =>
		onChange(expiresAtFromPreset(p), t(`locations.durations.${p}`));
	const onCustom = (_e: DateTimePickerEvent, d?: Date) => {
		if (!d) return;
		setCustom(d);
		onChange(expiresAtFromCustom(d), d.toLocaleString());
	};
	const openAndroidCustom = () => {
		const base = custom ?? new Date(Date.now() + 3600_000);
		DateTimePickerAndroid.open({
			value: base,
			mode: "date",
			minimumDate: new Date(),
			onChange: (_e, d) => {
				if (!d) return;
				DateTimePickerAndroid.open({
					value: d,
					mode: "time",
					onChange: onCustom,
				});
			},
		});
	};

	return (
		<View className="gap-2">
			{DURATION_PRESETS.map((p) => (
				<Button
					key={p}
					size="lg"
					fullWidth
					onPress={() => pickPreset(p)}
					accessibilityRole="button"
				>
					<Text>{t(`locations.durations.${p}`)}</Text>
				</Button>
			))}
			{Platform.OS === "ios" ? (
				<DateTimePicker
					value={custom ?? new Date(Date.now() + 3600_000)}
					mode="datetime"
					minimumDate={new Date()}
					onChange={onCustom}
				/>
			) : (
				<Button
					size="lg"
					fullWidth
					onPress={openAndroidCustom}
					accessibilityRole="button"
				>
					<Text>{t("locations.durations.custom")}</Text>
				</Button>
			)}
		</View>
	);
}
