export interface EntrancePlan {
	animate: boolean;
	delayMs: number;
}

// Decides whether/with-what-delay an item should animate in. Caps the stagger
// to the first screenful so recycled FlashList rows past the fold appear
// instantly; reduced-motion fades with no stagger.
export function entranceFor(
	index: number,
	opts: { reduced: boolean; disabled?: boolean; cap?: number },
): EntrancePlan {
	const cap = opts.cap ?? 8;
	if (opts.disabled || index >= cap) return { animate: false, delayMs: 0 };
	if (opts.reduced) return { animate: true, delayMs: 0 };
	return { animate: true, delayMs: index * 50 };
}
