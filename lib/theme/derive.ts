import { glowColor, gradientStops, tripletToHex } from "@/lib/theme/color";
import { TOKEN_KEYS, type TokenKey, type TokenMap } from "@/lib/theme/tokens";

export interface ThemeVisuals {
	colors: Record<TokenKey, string>;
	gradient: {
		colors: [string, string];
		start: { x: number; y: number };
		end: { x: number; y: number };
	};
	glow: string;
}

export function resolveThemeVisuals(
	triplets: TokenMap,
	scheme: "light" | "dark",
): ThemeVisuals {
	// Hex (not "hsl(H S% L%)"): RN's color parser doesn't reliably handle the
	// space-separated hsl syntax, so a raw `colors.x` on shadowColor/borderColor/
	// nav theme would silently fall back to a wrong color (white).
	const colors = {} as Record<TokenKey, string>;
	for (const key of TOKEN_KEYS) colors[key] = tripletToHex(triplets[key]);
	return {
		colors,
		gradient: {
			colors: gradientStops(triplets.primary, triplets.accent, scheme),
			start: { x: 0, y: 0 },
			end: { x: 1, y: 1 },
		},
		glow: glowColor(triplets.primary, scheme),
	};
}
