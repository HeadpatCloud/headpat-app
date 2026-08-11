type Opts = { showDay: boolean; showYear: boolean };

/** "13 July 2000" / "July 2000" / "13 July" / "July" — month always shows.
 *  Mirrors the web's formatter so both surfaces render birthdays identically. */
export function formatBirthday(
	birthday: string | Date,
	{ showDay, showYear }: Opts,
): string {
	return new Date(birthday).toLocaleDateString("en-GB", {
		...(showDay ? { day: "numeric" } : {}),
		month: "long",
		...(showYear ? { year: "numeric" } : {}),
	});
}
