import {
	contrastRatio,
	ensureContrast,
	glowColor,
	gradientStops,
	hexToTriplet,
	readableForeground,
	relativeLuminance,
	tripletToHex,
	withAlpha,
} from "@/lib/theme/color";
import { resolveThemeVisuals } from "@/lib/theme/derive";
import { elevation, RADIUS, TYPE } from "@/lib/theme/foundations";
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
	it("black is 0", () =>
		expect(relativeLuminance("0 0% 0%")).toBeCloseTo(0, 2));
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
	it("wraps hue past 360 when synthesizing", () => {
		// accent == primary -> synthesize; hue (350 + 14) % 360 = 4, L 40+6=46 (dark)
		const stops = gradientStops("350 80% 40%", "350 80% 40%", "dark");
		expect(stops[1]).toBe(tripletToHex("4 80% 46%"));
		expect(stops[1]).not.toBe(stops[0]);
	});
	it("clamps synthesized lightness at 100 in dark", () => {
		// 96 + 6 = 102 -> clamped to 100
		const stops = gradientStops("160 100% 96%", "160 100% 96%", "dark");
		expect(stops[1]).toBe(tripletToHex("174 100% 100%"));
	});
});

describe("ensureContrast", () => {
	it("returns the foreground unchanged when the pair already passes", () =>
		expect(ensureContrast("#000000", "#ffffff", 4.5)).toBe("#000000"));
	it("repairs the headpat light muted pair to 4.5", () => {
		const fg = tripletToHex(PRESETS.headpat.light["muted-foreground"]);
		const bg = tripletToHex(PRESETS.headpat.light.muted);
		const fixed = ensureContrast(fg, bg, 4.5);
		expect(
			contrastRatio(hexToTriplet(fixed), hexToTriplet(bg)),
		).toBeGreaterThanOrEqual(4.5);
		expect(fixed).not.toBe(tripletToHex(readableForeground(hexToTriplet(bg))));
	});
	it("repairs the headpat dark accent pair to 3", () => {
		const fg = tripletToHex(PRESETS.headpat.dark["accent-foreground"]);
		const bg = tripletToHex(PRESETS.headpat.dark.accent);
		const fixed = ensureContrast(fg, bg, 3);
		expect(
			contrastRatio(hexToTriplet(fixed), hexToTriplet(bg)),
		).toBeGreaterThanOrEqual(3);
	});
	it("falls back to black/white when the hue cannot reach the ratio", () => {
		// mid-gray bg, asking for an impossible ratio forces the fallback
		const fixed = ensureContrast("#808080", "#808080", 21);
		expect(["#ffffff", "#000000"]).toContain(fixed);
	});
});

describe("withAlpha", () => {
	it("hex gains the alpha", () =>
		expect(withAlpha("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)"));
	it("rgba alphas multiply", () =>
		expect(withAlpha("rgba(1, 2, 3, 0.5)", 0.6)).toBe("rgba(1, 2, 3, 0.3)"));
	it("passes through unparseable colors", () =>
		expect(withAlpha("teal", 0.5)).toBe("teal"));
});

describe("glowColor", () => {
	it("dark uses 0.45 alpha", () =>
		expect(glowColor("160 100% 25%", "dark")).toMatch(/, 0\.45\)$/));
	it("light uses 0.28 alpha", () =>
		expect(glowColor("160 100% 25%", "light")).toMatch(/, 0\.28\)$/));
	it("returns an rgba string", () =>
		expect(glowColor("160 100% 25%", "dark")).toMatch(
			/^rgba\(\d+, \d+, \d+, /,
		));
	it("floors very dark primaries to L=30 before alpha", () => {
		// 155 100% 19% is floored to 155 100% 30% before the alpha is applied
		expect(glowColor("155 100% 19%", "dark")).toBe(
			glowColor("155 100% 30%", "dark"),
		);
	});
});

describe("foundations", () => {
	it("radius scale matches the spec", () => {
		expect(RADIUS).toEqual({
			xs: 8,
			sm: 12,
			md: 16,
			lg: 22,
			xl: 28,
			pill: 999,
		});
	});
	it("display type is 40/800/-0.5", () => {
		expect(TYPE.display.fontSize).toBe(40);
		expect(TYPE.display.fontWeight).toBe("800");
		expect(TYPE.display.letterSpacing).toBe(-0.5);
	});
	it("dark elevation carries the glow in its boxShadow", () => {
		const e = elevation(2, "dark", "rgba(1, 2, 3, 0.45)");
		expect(e.boxShadow).toBe("0 6 16 rgba(1, 2, 3, 0.248)");
	});
	it("light elevation uses the foreground-derived shadow, not glow", () => {
		const e = elevation(2, "light", "rgba(1, 2, 3, 0.45)", "#000000");
		expect(e.boxShadow).toBe("0 6 16 rgba(0, 0, 0, 0.14)");
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

describe("preset gradients", () => {
	it("every preset yields two distinct stops in both schemes", () => {
		for (const slug of Object.keys(PRESETS) as (keyof typeof PRESETS)[]) {
			for (const scheme of ["light", "dark"] as const) {
				const t = PRESETS[slug][scheme];
				const [a, b] = gradientStops(t.primary, t.accent, scheme);
				expect(a).not.toBe(b);
			}
		}
	});
});

describe("preset accents", () => {
	it("headpat light accent differs from its primary", () => {
		expect(PRESETS.headpat.light.accent).not.toBe(
			PRESETS.headpat.light.primary,
		);
	});
	it("slate accent differs from its primary in both schemes", () => {
		expect(PRESETS.slate.light.accent).not.toBe(PRESETS.slate.light.primary);
		expect(PRESETS.slate.dark.accent).not.toBe(PRESETS.slate.dark.primary);
	});
});

describe("resolveThemeVisuals", () => {
	const v = resolveThemeVisuals(PRESETS.ocean.dark, "dark");
	it("colors are parseable hex strings", () =>
		expect(v.colors.primary).toBe(tripletToHex(PRESETS.ocean.dark.primary)));
	it("exposes all 22 color keys", () =>
		expect(Object.keys(v.colors)).toHaveLength(22));
	it("gradient has two hex stops + start/end", () => {
		expect(v.gradient.colors).toHaveLength(2);
		expect(v.gradient.colors[0]).toMatch(/^#[0-9a-f]{6}$/);
		expect(v.gradient.start).toEqual({ x: 0, y: 0 });
		expect(v.gradient.end).toEqual({ x: 1, y: 1 });
	});
	it("glow is an rgba string", () => expect(v.glow).toMatch(/^rgba\(/));
});
