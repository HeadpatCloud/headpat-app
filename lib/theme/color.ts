import type { TokenMap } from "@/lib/theme/tokens";

// "#rrggbb" -> "H S% L%" triplet. Custom themes are stored as hex on the server;
// NativeWind needs bare HSL triplets behind `hsl(var(--token))`.
export function hexToTriplet(hex: string): string {
	const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
	if (!m) return "0 0% 0%";
	const int = Number.parseInt(m[1], 16);
	const r = ((int >> 16) & 255) / 255;
	const g = ((int >> 8) & 255) / 255;
	const b = (int & 255) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	let h = 0;
	let s = 0;
	const d = max - min;
	if (d !== 0) {
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
		else if (max === g) h = (b - r) / d + 2;
		else h = (r - g) / d + 4;
		h /= 6;
	}
	return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// "H S% L%" -> "#rrggbb". The builder edits hex, so preset triplets convert back
// to hex swatches for the pickers.
export function tripletToHex(triplet: string): string {
	const m = /^\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*$/.exec(triplet);
	if (!m) return "#000000";
	const h = Number.parseFloat(m[1]) / 360;
	const s = Number.parseFloat(m[2]) / 100;
	const l = Number.parseFloat(m[3]) / 100;
	const hue = (p: number, q: number, t0: number): number => {
		let t = t0;
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	let r: number;
	let g: number;
	let b: number;
	if (s === 0) {
		r = l;
		g = l;
		b = l;
	} else {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue(p, q, h + 1 / 3);
		g = hue(p, q, h);
		b = hue(p, q, h - 1 / 3);
	}
	const to = (x: number) =>
		Math.round(x * 255)
			.toString(16)
			.padStart(2, "0");
	return `#${to(r)}${to(g)}${to(b)}`;
}

// TokenMap (triplets) -> NativeWind vars() input ({ "--background": "0 0% 100%" }).
export function tokensToVars(tokens: TokenMap): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(tokens)) out[`--${k}`] = v;
	return out;
}
