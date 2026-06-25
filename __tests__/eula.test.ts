import { eulaNeedsAcceptance } from "@/lib/eula";

describe("eulaNeedsAcceptance", () => {
	it("never gates without a known server date", () => {
		expect(eulaNeedsAcceptance(null, null)).toBe(false);
		expect(eulaNeedsAcceptance("2026-01-01T00:00:00.000Z", null)).toBe(false);
	});

	it("gates when nothing was accepted yet", () => {
		expect(eulaNeedsAcceptance(null, "2026-01-01T00:00:00.000Z")).toBe(true);
	});

	it("gates when the server date is newer than the acceptance", () => {
		expect(
			eulaNeedsAcceptance(
				"2026-01-01T00:00:00.000Z",
				"2026-06-12T00:00:00.000Z",
			),
		).toBe(true);
	});

	it("treats corrupt dates safely: bad acceptance re-gates, bad server date never gates", () => {
		expect(eulaNeedsAcceptance("garbage", "2026-06-12T00:00:00.000Z")).toBe(
			true,
		);
		expect(eulaNeedsAcceptance("2026-01-01T00:00:00.000Z", "garbage")).toBe(
			false,
		);
	});

	it("does not gate when the acceptance is current or newer", () => {
		expect(
			eulaNeedsAcceptance(
				"2026-06-12T00:00:00.000Z",
				"2026-06-12T00:00:00.000Z",
			),
		).toBe(false);
		expect(
			eulaNeedsAcceptance(
				"2026-07-01T00:00:00.000Z",
				"2026-06-12T00:00:00.000Z",
			),
		).toBe(false);
	});
});
