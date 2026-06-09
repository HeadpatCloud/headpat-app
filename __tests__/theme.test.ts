import { contrastRatio, gradientStops, hexToTriplet, readableForeground, relativeLuminance, tripletToHex } from "@/lib/theme/color";
import { PRESETS } from "@/lib/theme/presets";
import { TOKEN_KEYS } from "@/lib/theme/tokens";

describe("hexToTriplet", () => {
	it("white", () => expect(hexToTriplet("#ffffff")).toBe("0 0% 100%"));
	it("black", () => expect(hexToTriplet("#000000")).toBe("0 0% 0%"));
	it("red", () => expect(hexToTriplet("#ff0000")).toBe("0 100% 50%"));
	it("tolerates no leading hash", () =>
		expect(hexToTriplet("00ff00")).toBe("120 100% 50%"));
	it("falls back for garbage", () =>
		expect(hexToTriplet("nope")).toBe("0 0% 0%"));
});

describe("tripletToHex", () => {
	it("white", () => expect(tripletToHex("0 0% 100%")).toBe("#ffffff"));
	it("black", () => expect(tripletToHex("0 0% 0%")).toBe("#000000"));
	it("round-trips primary colors", () => {
		for (const hex of ["#ff0000", "#00ff00", "#0000ff"]) {
			expect(tripletToHex(hexToTriplet(hex))).toBe(hex);
		}
	});
});

describe("relativeLuminance", () => {
	it("white is ~1", () =>
		expect(relativeLuminance("0 0% 100%")).toBeCloseTo(1, 2));
	it("black is 0", () => expect(relativeLuminance("0 0% 0%")).toBeCloseTo(0, 2));
	it("falls back to 0 for garbage", () =>
		expect(relativeLuminance("nope")).toBe(0));
});

describe("contrastRatio", () => {
	it("white vs black is 21", () =>
		expect(contrastRatio("0 0% 100%", "0 0% 0%")).toBeCloseTo(21, 0));
	it("is symmetric", () =>
		expect(contrastRatio("0 0% 0%", "0 0% 100%")).toBeCloseTo(21, 0));
});

describe("readableForeground", () => {
	it("white background -> black text", () =>
		expect(readableForeground("0 0% 100%")).toBe("0 0% 0%"));
	it("black background -> white text", () =>
		expect(readableForeground("0 0% 0%")).toBe("0 0% 100%"));
	it("dark brand -> white text", () =>
		expect(readableForeground("160 100% 25%")).toBe("0 0% 100%"));
});

describe("gradientStops", () => {
	it("passes a distinct accent through unchanged", () => {
		const stops = gradientStops("196 80% 38%", "172 70% 38%", "light");
		expect(stops).toEqual([
			tripletToHex("196 80% 38%"),
			tripletToHex("172 70% 38%"),
		]);
	});
	it("synthesizes a different second stop when accent ~= primary", () => {
		const stops = gradientStops("160 100% 25%", "160 100% 25%", "light");
		expect(stops[0]).toBe(tripletToHex("160 100% 25%"));
		expect(stops[1]).not.toBe(stops[0]);
	});
	it("shifts lightness up in dark, down in light", () => {
		const dark = gradientStops("160 100% 25%", "160 100% 25%", "dark");
		const light = gradientStops("160 100% 25%", "160 100% 25%", "light");
		expect(dark[1]).toBe(tripletToHex("174 100% 31%"));
		expect(light[1]).toBe(tripletToHex("174 100% 19%"));
	});
	it("falls back to primary hex twice for garbage input", () => {
		const stops = gradientStops("nope", "nope", "light");
		expect(stops[0]).toBe(stops[1]);
	});
});

describe("PRESETS", () => {
	it("every preset defines all 22 tokens for light and dark", () => {
		for (const slug of Object.keys(PRESETS) as (keyof typeof PRESETS)[]) {
			const preset = PRESETS[slug];
			for (const key of TOKEN_KEYS) {
				expect(preset.light[key]).toBeTruthy();
				expect(preset.dark[key]).toBeTruthy();
			}
		}
	});
});
