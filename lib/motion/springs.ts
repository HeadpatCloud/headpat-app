// Single source of truth for spring feel — no inline spring numbers elsewhere.
export const springs = {
	// entrances / sheets / gallery open: slight overshoot, energetic
	gentle: { damping: 18, stiffness: 180, mass: 1 },
	// press feedback scale: fast, almost no overshoot
	snappy: { damping: 26, stiffness: 380, mass: 0.7 },
	// layout shifts / reflow: smooth, no bounce
	layout: { damping: 22, stiffness: 220, mass: 1 },
} as const;

// Only the reduced-motion opacity path uses durations.
export const durations = { fast: 120, base: 220, slow: 340 } as const;
