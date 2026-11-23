import type {
	HomeSection,
	HomeSectionId,
	WidgetSettings,
} from "@backend/db/schemas";
import { kvGet, kvSet } from "@/lib/db/kv";

export type {
	HomeSection,
	HomeSectionId,
	WidgetSettings,
	WidgetTheme,
} from "@backend/db/schemas";

/** Mirrors HOME_SECTIONS in the API: the Home tab's sections, default order. */
export const HOME_SECTIONS: readonly HomeSectionId[] = [
	"hero",
	"upNext",
	"tiles",
	"communities",
	"people",
	"gallery",
];

/** Mirrors DEFAULT_WIDGET_SETTINGS in the API. */
export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
	theme: "app",
	nextEvent: { includePublic: true },
	chats: { showPreviews: false },
	home: { sections: HOME_SECTIONS.map((id) => ({ id, hidden: false })) },
};

/** Mirrors withHomeDefaults in the API. */
export function withHomeDefaults(
	stored: HomeSection[] | null | undefined,
): HomeSection[] {
	const out = (stored ?? []).filter((s) => HOME_SECTIONS.includes(s.id));
	HOME_SECTIONS.forEach((id, i) => {
		if (out.some((s) => s.id === id)) return;
		const before = HOME_SECTIONS[i - 1];
		const at = before ? out.findIndex((s) => s.id === before) + 1 : 0;
		out.splice(at, 0, { id, hidden: false });
	});
	return out;
}

const SETTINGS_KEY = "hp-widget-settings";

export interface StoredWidgetSettings {
	settings: WidgetSettings;
	/** When the user last changed them on this device; null = never touched. */
	changedAt: number | null;
	/** Changed while signed in but not yet saved to the account (offline, error). */
	pending?: boolean;
}

export function withDefaults(
	partial: Partial<WidgetSettings> | null | undefined,
): WidgetSettings {
	const d = DEFAULT_WIDGET_SETTINGS;
	return {
		theme: partial?.theme ?? d.theme,
		nextEvent: { ...d.nextEvent, ...partial?.nextEvent },
		chats: { ...d.chats, ...partial?.chats },
		home: { sections: withHomeDefaults(partial?.home?.sections) },
	};
}

/**
 * The settings the widgets render with. Signed-in devices keep a copy of the
 * account's settings here, so background refreshes never need a second request.
 */
export function readWidgetSettings(): StoredWidgetSettings {
	const raw = kvGet(SETTINGS_KEY);
	if (!raw) return { settings: DEFAULT_WIDGET_SETTINGS, changedAt: null };
	try {
		const parsed = JSON.parse(raw) as Partial<StoredWidgetSettings>;
		return {
			settings: withDefaults(parsed.settings),
			changedAt: parsed.changedAt ?? null,
			pending: parsed.pending ?? false,
		};
	} catch {
		return { settings: DEFAULT_WIDGET_SETTINGS, changedAt: null };
	}
}

export function writeWidgetSettings(value: StoredWidgetSettings): void {
	kvSet(SETTINGS_KEY, JSON.stringify(value));
}
