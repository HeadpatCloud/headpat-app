import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { Aurora } from "@/components/brand/aurora";
import { HeadpatLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/ui/gradient-text";
import { Text } from "@/components/ui/text";
import { isAdultDob } from "@/lib/age-gate";
import { checkAgeSignal } from "@/lib/age-range";
import {
	defaultBirthDate,
	formatBirthDate,
	MIN_BIRTH_DATE,
	openBirthDatePicker,
} from "@/lib/birth-date-picker";
import { useI18n } from "@/lib/i18n/provider";

type GateState = "checking" | "dob" | "blocked";

export function AgeGate({ onClear }: { onClear: (dob?: Date) => void }) {
	const { t, locale } = useI18n();
	const [state, setState] = useState<GateState>("checking");
	const [dob, setDob] = useState<Date>(defaultBirthDate);

	useEffect(() => {
		let active = true;
		checkAgeSignal().then((signal) => {
			if (!active) return;
			if (signal === "adult") onClear();
			else if (signal === "minor") setState("blocked");
			else setState("dob");
		});
		return () => {
			active = false;
		};
	}, [onClear]);

	const onConfirmDob = () => {
		if (isAdultDob(dob, new Date())) onClear(dob);
		else setState("blocked");
	};

	const openAndroidPicker = () => openBirthDatePicker(dob, setDob);

	const blocked = state === "blocked";

	return (
		<View
			style={StyleSheet.absoluteFill}
			className="bg-background justify-center px-6"
		>
			<Aurora />
			<View className="items-center gap-3">
				<HeadpatLogo
					size={80}
					accessibilityLabel={t("auth.onboarding.logoA11y")}
				/>
				<GradientText className="text-center text-3xl font-extrabold tracking-tight">
					{blocked ? t("ageGate.blockedTitle") : t("ageGate.title")}
				</GradientText>
				<Text variant="muted" className="text-center">
					{blocked ? t("ageGate.blockedBody") : t("ageGate.body")}
				</Text>
			</View>

			{state === "checking" ? (
				<View className="items-center pt-6">
					<ActivityIndicator accessibilityLabel={t("ageGate.checking")} />
				</View>
			) : null}

			{state === "dob" ? (
				<View className="gap-3 pt-6">
					{Platform.OS === "ios" ? (
						<DateTimePicker
							value={dob}
							mode="date"
							display="spinner"
							minimumDate={MIN_BIRTH_DATE}
							maximumDate={new Date()}
							onChange={(_e, date) => {
								if (date) setDob(date);
							}}
						/>
					) : (
						<Button
							size="lg"
							fullWidth
							onPress={openAndroidPicker}
							accessibilityRole="button"
						>
							<Text>
								{t("ageGate.pickDob", { date: formatBirthDate(dob, locale) })}
							</Text>
						</Button>
					)}
					<Button
						size="lg"
						fullWidth
						onPress={onConfirmDob}
						accessibilityRole="button"
						accessibilityLabel={t("ageGate.confirm")}
					>
						<Text>{t("ageGate.confirm")}</Text>
					</Button>
				</View>
			) : null}
		</View>
	);
}
