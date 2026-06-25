export const AGE_CLEARED_KEY = "hp-age-cleared-at";

// Full years between dob and now, decremented if this year's birthday hasn't
// happened yet. Correct across month/day boundaries and leap-day birthdays.
export function ageFromDob(dob: Date, now: Date): number {
	let age = now.getFullYear() - dob.getFullYear();
	const monthDiff = now.getMonth() - dob.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
		age--;
	}
	return age;
}

export function isAdultDob(dob: Date, now: Date): boolean {
	return ageFromDob(dob, now) >= 18;
}
