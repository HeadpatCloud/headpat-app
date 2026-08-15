import { I18n, type TranslateOptions } from "i18n-js";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { kvGet, kvSet } from "@/lib/db/kv";
import de from "@/lib/i18n/translations/de.json";
import en from "@/lib/i18n/translations/en.json";
import nl from "@/lib/i18n/translations/nl.json";

export const LOCALES = [
	{ code: "en", label: "English" },
	{ code: "de", label: "Deutsch" },
	{ code: "nl", label: "Nederlands" },
] as const;
export type Locale = (typeof LOCALES)[number]["code"];

const LOCALE_KEY = "hp-locale";

const i18n = new I18n({ en, de, nl });
i18n.enableFallback = true;
i18n.defaultLocale = "en";

// Hermes ships Intl, so the device language needs no native module.
function deviceLocale(): Locale {
	try {
		const lang = Intl.DateTimeFormat()
			.resolvedOptions()
			.locale.split("-")[0] as Locale;
		return LOCALES.some((l) => l.code === lang) ? lang : "en";
	} catch {
		return "en";
	}
}

interface I18nContextValue {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	t: (key: string, options?: TranslateOptions) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
	const ctx = useContext(I18nContext);
	if (!ctx) throw new Error("useI18n must be used within I18nProvider");
	return ctx;
}

export function I18nProvider({ children }: { children: ReactNode }) {
	const [locale, setLocaleState] = useState<Locale>(() => {
		// Stored choice wins over the device language, and both resolve
		// synchronously so no frame renders in the wrong language.
		const stored = kvGet(LOCALE_KEY);
		const initial =
			stored && LOCALES.some((l) => l.code === stored)
				? (stored as Locale)
				: deviceLocale();
		i18n.locale = initial;
		return initial;
	});

	const setLocale = useCallback((next: Locale) => {
		i18n.locale = next;
		setLocaleState(next);
		kvSet(LOCALE_KEY, next);
	}, []);

	// locale drives the mutable i18n singleton — the callback identity must
	// change with it so consumers re-render with the new language.
	// biome-ignore lint/correctness/useExhaustiveDependencies: see above
	const t = useCallback(
		(key: string, options?: TranslateOptions) => i18n.t(key, options),
		[locale],
	);

	const value = useMemo(
		() => ({ locale, setLocale, t }),
		[locale, setLocale, t],
	);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
