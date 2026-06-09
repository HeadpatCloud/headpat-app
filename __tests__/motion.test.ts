import { entranceFor } from "@/lib/motion/stagger";
import { durations, springs } from "@/lib/motion/springs";

describe("springs", () => {
	it("gentle = entrance overshoot", () =>
		expect(springs.gentle).toEqual({ damping: 18, stiffness: 180, mass: 1 }));
	it("snappy = press", () =>
		expect(springs.snappy).toEqual({ damping: 26, stiffness: 380, mass: 0.7 }));
	it("layout = calm reflow", () =>
		expect(springs.layout).toEqual({ damping: 22, stiffness: 220, mass: 1 }));
	it("durations for the reduced-motion opacity path", () =>
		expect(durations).toEqual({ fast: 120, base: 220, slow: 340 }));
});

describe("entranceFor", () => {
	it("staggers the first screenful by 50ms each", () => {
		expect(entranceFor(0, { reduced: false })).toEqual({ animate: true, delayMs: 0 });
		expect(entranceFor(3, { reduced: false })).toEqual({ animate: true, delayMs: 150 });
	});
	it("stops animating past the cap (default 8)", () =>
		expect(entranceFor(8, { reduced: false })).toEqual({ animate: false, delayMs: 0 }));
	it("respects a custom cap", () =>
		expect(entranceFor(3, { reduced: false, cap: 3 })).toEqual({ animate: false, delayMs: 0 }));
	it("disabled never animates", () =>
		expect(entranceFor(0, { reduced: false, disabled: true })).toEqual({ animate: false, delayMs: 0 }));
	it("reduced motion fades with no stagger delay", () =>
		expect(entranceFor(5, { reduced: true })).toEqual({ animate: true, delayMs: 0 }));
});
