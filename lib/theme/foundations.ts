import type { TextStyle, ViewStyle } from "react-native";

export const RADIUS = {
	xs: 8,
	sm: 12,
	md: 16,
	lg: 22,
	xl: 28,
	pill: 999,
} as const;

type TypeStyle = Pick<
	TextStyle,
	"fontSize" | "fontWeight" | "letterSpacing" | "lineHeight"
>;

// Canonical type scale (spec §1.8). System font; weights/tracking only.
export const TYPE: Record<
	"display" | "h1" | "h2" | "title" | "body" | "small" | "caption",
	TypeStyle
> = {
	display: { fontSize: 40, fontWeight: "800", letterSpacing: -0.5, lineHeight: 44 },
	h1: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5, lineHeight: 38 },
	h2: { fontSize: 26, fontWeight: "700", letterSpacing: -0.4, lineHeight: 32 },
	title: { fontSize: 20, fontWeight: "600", letterSpacing: -0.2, lineHeight: 26 },
	body: { fontSize: 16, fontWeight: "400", letterSpacing: 0, lineHeight: 24 },
	small: { fontSize: 14, fontWeight: "400", letterSpacing: 0, lineHeight: 20 },
	caption: { fontSize: 12, fontWeight: "500", letterSpacing: 0, lineHeight: 16 },
};

// Mode-aware elevation. Dark = colored glow shadow; light = soft ambient shadow
// whose color comes from the foreground token (never a hard-coded #000).
export function elevation(
	level: 1 | 2 | 3,
	scheme: "light" | "dark",
	glow: string,
	foreground = "hsl(0 0% 0%)",
): ViewStyle {
	const ramp = {
		1: { radius: 8, offset: 3, opacity: scheme === "dark" ? 0.5 : 0.1, elev: 2 },
		2: { radius: 16, offset: 6, opacity: scheme === "dark" ? 0.55 : 0.14, elev: 5 },
		3: { radius: 28, offset: 12, opacity: scheme === "dark" ? 0.6 : 0.18, elev: 10 },
	}[level];
	return {
		shadowColor: scheme === "dark" ? glow : foreground,
		shadowOffset: { width: 0, height: ramp.offset },
		shadowOpacity: ramp.opacity,
		shadowRadius: ramp.radius,
		elevation: ramp.elev,
	};
}
