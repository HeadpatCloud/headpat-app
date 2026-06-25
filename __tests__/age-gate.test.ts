import { ageFromDob, isAdultDob } from "@/lib/age-gate";

const now = new Date("2026-06-13T12:00:00.000Z");

describe("ageFromDob", () => {
	it("counts full years", () => {
		expect(ageFromDob(new Date("2000-06-13"), now)).toBe(26);
		expect(ageFromDob(new Date("2008-01-01"), now)).toBe(18);
	});

	it("does not count a birthday that hasn't happened yet this year", () => {
		expect(ageFromDob(new Date("2008-06-14"), now)).toBe(17);
		expect(ageFromDob(new Date("2008-06-13"), now)).toBe(18);
	});

	it("handles leap-day birthdays", () => {
		expect(ageFromDob(new Date("2008-02-29"), now)).toBe(18);
	});
});

describe("isAdultDob", () => {
	it("is true at exactly 18 today, false at 18-minus-one-day", () => {
		expect(isAdultDob(new Date("2008-06-13"), now)).toBe(true);
		expect(isAdultDob(new Date("2008-06-14"), now)).toBe(false);
	});
});
