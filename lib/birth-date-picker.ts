import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

export const MIN_BIRTH_DATE = new Date(1900, 0, 1);

/** Where the picker opens when no date is set yet: 18 years ago keeps it near
 *  the ages people actually pick instead of today. */
export function defaultBirthDate(): Date {
	const d = new Date();
	d.setFullYear(d.getFullYear() - 18);
	return d;
}

/** Android date of birth dialog. The spinner shows day, month and year wheels
 *  at once, in the device's date order, so a full date takes one dialog. The
 *  calendar dialog opened on its year list instead, which read as year only. */
export function openBirthDatePicker(
	value: Date,
	onPick: (date: Date) => void,
): void {
	DateTimePickerAndroid.open({
		value,
		mode: "date",
		display: "spinner",
		minimumDate: MIN_BIRTH_DATE,
		maximumDate: new Date(),
		onValueChange: (_e, date) => onPick(date),
	});
}

/** "16 August 2000" / "16. August 2000" / "16 augustus 2000" in the app
 *  language. English uses en-GB, like profile birthdays (lib/birthday.ts). */
export function formatBirthDate(date: Date, locale: string): string {
	return date.toLocaleDateString(locale === "en" ? "en-GB" : locale, {
		dateStyle: "long",
	});
}
