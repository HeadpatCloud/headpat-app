import type { TranslateOptions } from "i18n-js";
import { kvGet } from "@/lib/db/kv";
import { i18n, storedLocale } from "@/lib/i18n/provider";
import { resolveThemeVisuals } from "@/lib/theme/derive";
import {
	ACTIVE_KEY,
	CUSTOM_KEY,
	type CustomTheme,
	MODE_KEY,
	resolveTriplets,
} from "@/lib/theme/provider";
import type { WidgetTheme } from "@/widgets/settings";

export type HexColor = `#${string}`;

export interface WidgetPalette {
	background: HexColor;
	foreground: HexColor;
	muted: HexColor;
	mutedForeground: HexColor;
	primary: HexColor;
	primaryForeground: HexColor;
	link: HexColor;
	border: HexColor;
}

function customThemes(): CustomTheme[] {
	const raw = kvGet(CUSTOM_KEY);
	if (!raw) return [];
	try {
		return JSON.parse(raw) as CustomTheme[];
	} catch {
		return [];
	}
}

/** The app's active theme in the given scheme, as widget colors. */
export function widgetPalette(scheme: "light" | "dark"): WidgetPalette {
	const triplets = resolveTriplets(
		kvGet(ACTIVE_KEY) ?? "headpat",
		scheme,
		customThemes(),
	);
	const c = resolveThemeVisuals(triplets, scheme).colors;
	const hex = (v: string) => v as HexColor;
	return {
		background: hex(c.card),
		foreground: hex(c["card-foreground"]),
		muted: hex(c.muted),
		mutedForeground: hex(c["muted-foreground"]),
		primary: hex(c.primary),
		primaryForeground: hex(c["primary-foreground"]),
		link: hex(c.link),
		border: hex(c.border),
	};
}

/**
 * Which schemes a widget should be drawn in. "app" follows the app's own mode,
 * and for "system" both variants are drawn so the launcher can switch them.
 */
export function widgetSchemes(theme: WidgetTheme): "light" | "dark" | "system" {
	if (theme !== "app") return theme;
	const mode = kvGet(MODE_KEY);
	return mode === "light" || mode === "dark" ? mode : "system";
}

/** Translates in the app's language without needing the React provider. */
export function wt(key: string, options?: TranslateOptions): string {
	return i18n.t(`widgets.${key}`, { ...options, locale: storedLocale() });
}

/** "Today, 19:00" / "Sat 29 Nov, 19:00" in the app's language. */
export function formatEventTime(startsAt: number, now = Date.now()): string {
	const locale = storedLocale();
	const start = new Date(startsAt);
	const time = start.toLocaleTimeString(locale, {
		hour: "2-digit",
		minute: "2-digit",
	});
	const dayDiff = Math.round(
		(new Date(start).setHours(0, 0, 0, 0) -
			new Date(now).setHours(0, 0, 0, 0)) /
			86_400_000,
	);
	if (startsAt <= now) return wt("event.now");
	if (dayDiff === 0) return wt("event.today", { time });
	if (dayDiff === 1) return wt("event.tomorrow", { time });
	const day = start.toLocaleDateString(locale, {
		weekday: "short",
		day: "numeric",
		month: "short",
	});
	return `${day}, ${time}`;
}
