import {
	Fredoka_500Medium,
	Fredoka_600SemiBold,
	Fredoka_700Bold,
} from "@expo-google-fonts/fredoka";
import {
	Nunito_400Regular,
	Nunito_400Regular_Italic,
	Nunito_500Medium,
	Nunito_600SemiBold,
	Nunito_700Bold,
	Nunito_800ExtraBold,
	Nunito_900Black,
} from "@expo-google-fonts/nunito";
import type { TextStyle } from "react-native";

// Same pairing as headpat-place-web: Nunito for body copy, Fredoka for headings.
// Each weight is its own static family, because Android can't pick a weight out
// of a runtime-loaded family; fontFamilyFor() maps a weight to the right one.
export const FONT_ASSETS = {
	Fredoka_500Medium,
	Fredoka_600SemiBold,
	Fredoka_700Bold,
	Nunito_400Regular,
	Nunito_400Regular_Italic,
	Nunito_500Medium,
	Nunito_600SemiBold,
	Nunito_700Bold,
	Nunito_800ExtraBold,
	Nunito_900Black,
};

export type FontFamily = keyof typeof FONT_ASSETS;

export const FONT = {
	body: "Nunito_400Regular",
	display: "Fredoka_600SemiBold",
} as const satisfies Record<string, FontFamily>;

type Weight = 400 | 500 | 600 | 700 | 800 | 900;

const CLASS_WEIGHTS: Record<string, Weight> = {
	"font-thin": 400,
	"font-extralight": 400,
	"font-light": 400,
	"font-normal": 400,
	"font-medium": 500,
	"font-semibold": 600,
	"font-bold": 700,
	"font-extrabold": 800,
	"font-black": 900,
};

function toWeight(value: TextStyle["fontWeight"]): Weight | undefined {
	if (value === undefined) return undefined;
	if (value === "normal") return 400;
	if (value === "bold") return 700;
	const n = typeof value === "number" ? value : Number.parseInt(value, 10);
	if (Number.isNaN(n)) return undefined;
	if (n <= 400) return 400;
	if (n >= 900) return 900;
	return (Math.round(n / 100) * 100) as Weight;
}

export interface FontHints {
	className?: string;
	weight?: TextStyle["fontWeight"];
	display?: boolean;
	italic?: boolean;
}

// The last weight class wins, matching how tailwind-merge resolves conflicts.
export function weightFromClassName(className?: string): Weight | undefined {
	if (!className) return undefined;
	let found: Weight | undefined;
	for (const token of className.split(/\s+/)) {
		const w = CLASS_WEIGHTS[token];
		if (w) found = w;
	}
	return found;
}

export function hasDisplayClass(className?: string): boolean {
	return !!className && /(^|\s)font-display(\s|$)/.test(className);
}

export function fontFamilyFor({
	className,
	weight,
	display,
	italic,
}: FontHints): FontFamily {
	const w = toWeight(weight) ?? weightFromClassName(className) ?? 400;
	if (display || hasDisplayClass(className)) {
		if (w >= 700) return "Fredoka_700Bold";
		if (w <= 500) return "Fredoka_500Medium";
		return "Fredoka_600SemiBold";
	}
	if (italic && w === 400) return "Nunito_400Regular_Italic";
	switch (w) {
		case 500:
			return "Nunito_500Medium";
		case 600:
			return "Nunito_600SemiBold";
		case 700:
			return "Nunito_700Bold";
		case 800:
			return "Nunito_800ExtraBold";
		case 900:
			return "Nunito_900Black";
		default:
			return "Nunito_400Regular";
	}
}
