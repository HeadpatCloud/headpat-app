import { hexToTriplet, tripletToHex } from "@/lib/theme/color";
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
