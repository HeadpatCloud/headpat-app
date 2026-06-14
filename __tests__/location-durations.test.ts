import { DURATION_PRESETS, expiresAtFromCustom, expiresAtFromPreset } from "@/lib/location/durations";

const now = new Date("2026-06-14T00:00:00.000Z");

describe("expiresAtFromPreset", () => {
	it("5m / 1h / 1d offset from now", () => {
		expect(expiresAtFromPreset("5m", now)).toBe("2026-06-14T00:05:00.000Z");
		expect(expiresAtFromPreset("1h", now)).toBe("2026-06-14T01:00:00.000Z");
		expect(expiresAtFromPreset("1d", now)).toBe("2026-06-15T00:00:00.000Z");
	});
	it("indefinite is null", () => {
		expect(expiresAtFromPreset("indefinite", now)).toBeNull();
	});
	it("exposes presets for the picker (including indefinite)", () => {
		expect(DURATION_PRESETS).toContain("15m");
		expect(DURATION_PRESETS).toContain("indefinite");
	});
});

describe("expiresAtFromCustom", () => {
	it("serializes a chosen date", () => {
		expect(expiresAtFromCustom(new Date("2026-07-01T12:00:00.000Z"))).toBe("2026-07-01T12:00:00.000Z");
	});
});
