import { timeLeftLabel } from "@/lib/location/format";

const now = new Date("2026-06-14T00:00:00.000Z");

describe("timeLeftLabel", () => {
	it("null => indefinite", () => expect(timeLeftLabel(null, now)).toBe("indefinite"));
	it("past => expired", () => expect(timeLeftLabel("2026-06-13T23:59:00.000Z", now)).toBe("expired"));
	it("minutes / hours / days buckets", () => {
		expect(timeLeftLabel("2026-06-14T00:30:00.000Z", now)).toBe("30m");
		expect(timeLeftLabel("2026-06-14T05:00:00.000Z", now)).toBe("5h");
		expect(timeLeftLabel("2026-06-17T00:00:00.000Z", now)).toBe("3d");
	});
});
