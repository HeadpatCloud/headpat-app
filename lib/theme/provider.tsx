import {
	DarkTheme,
	DefaultTheme,
	type Theme as NavTheme,
	ThemeProvider as NavThemeProvider,
} from "expo-router/react-navigation";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { colorScheme, vars } from "nativewind";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useColorScheme as useDeviceScheme, View } from "react-native";
import { authClient } from "@/lib/auth-client";
import { kvGet, kvSet } from "@/lib/db/kv";
import { client } from "@/lib/orpc";
import { hexToTriplet, tokensToVars, tripletToHex } from "@/lib/theme/color";
import { resolveThemeVisuals, type ThemeVisuals } from "@/lib/theme/derive";
import { PRESETS, type PresetSlug } from "@/lib/theme/presets";
import { TOKEN_KEYS, type TokenMap } from "@/lib/theme/tokens";

export type ThemeMode = "light" | "dark" | "system";
export interface CustomTheme {
	id: string;
	name: string;
	light: Record<string, string>;
	dark: Record<string, string>;
}

const MODE_KEY = "hp-theme-mode";
const ACTIVE_KEY = "hp-active-theme";
const CUSTOM_KEY = "hp-custom-themes";

interface ThemeContextValue {
	mode: ThemeMode;
	setMode: (mode: ThemeMode) => void;
	scheme: "light" | "dark";
	activeTheme: string;
	setActiveTheme: (value: string) => void;
	customThemes: CustomTheme[];
	refreshCustomThemes: () => Promise<void>;
	colors: ThemeVisuals["colors"];
	gradient: ThemeVisuals["gradient"];
	glow: ThemeVisuals["glow"];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
	return ctx;
}

function resolveTriplets(
	active: string,
	scheme: "light" | "dark",
	customs: CustomTheme[],
): TokenMap {
	if (active.startsWith("custom:")) {
		const custom = customs.find((t) => t.id === active.slice(7));
		if (custom) {
			const src = custom[scheme] ?? {};
			const out = {} as TokenMap;
			for (const key of TOKEN_KEYS)
				out[key] = hexToTriplet(src[key] ?? "#000000");
			return out;
		}
	}
	const slug: PresetSlug =
		active in PRESETS ? (active as PresetSlug) : "headpat";
	return PRESETS[slug][scheme];
}

function buildNavTheme(triplets: TokenMap, scheme: "light" | "dark"): NavTheme {
	const base = scheme === "dark" ? DarkTheme : DefaultTheme;
	return {
		...base,
		colors: {
			...base.colors,
			background: tripletToHex(triplets.background),
			card: tripletToHex(triplets.card),
			text: tripletToHex(triplets.foreground),
			border: tripletToHex(triplets.border),
			primary: tripletToHex(triplets.primary),
			notification: tripletToHex(triplets.destructive),
		},
	};
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const device = useDeviceScheme();
	// Read in the initialisers: the store is synchronous, so the first frame is
	// already the user's theme and the splash needs no hydration wait.
	const [mode, setModeState] = useState<ThemeMode>(() => {
		const stored = kvGet(MODE_KEY);
		return stored === "light" || stored === "dark" || stored === "system"
			? stored
			: "system";
	});
	const [activeTheme, setActiveThemeState] = useState<string>(
		() => kvGet(ACTIVE_KEY) ?? "headpat",
	);
	const [customThemes, setCustomThemes] = useState<CustomTheme[]>(() => {
		const raw = kvGet(CUSTOM_KEY);
		if (!raw) return [];
		try {
			return JSON.parse(raw) as CustomTheme[];
		} catch {
			return [];
		}
	});
	const { data: session } = authClient.useSession();
	// Effects key on the user id, not the session object — better-auth emits a
	// fresh session object on every refetch (app focus, token refresh).
	const userId = session?.user?.id ?? null;

	useEffect(() => {
		SplashScreen.hideAsync().catch(() => {});
	}, []);

	const refreshCustomThemes = useCallback(async () => {
		try {
			const rows = (await client.theme.myThemes({})) as CustomTheme[];
			const next = JSON.stringify(rows);
			setCustomThemes((prev) => (JSON.stringify(prev) === next ? prev : rows));
			kvSet(CUSTOM_KEY, next);
		} catch {}
	}, []);

	// On sign-in, the account is the source of truth for the active theme.
	useEffect(() => {
		if (!userId) return;
		(async () => {
			try {
				const me = await client.profile.me({});
				if (me?.activeTheme) {
					setActiveThemeState(me.activeTheme);
					kvSet(ACTIVE_KEY, me.activeTheme);
				}
			} catch {}
			await refreshCustomThemes();
		})();
	}, [userId, refreshCustomThemes]);

	const scheme: "light" | "dark" =
		mode === "system" ? (device === "dark" ? "dark" : "light") : mode;

	// Keep NativeWind's class in sync so `dark:` utilities resolve correctly.
	useEffect(() => {
		colorScheme.set(scheme);
	}, [scheme]);

	const triplets = useMemo(
		() => resolveTriplets(activeTheme, scheme, customThemes),
		[activeTheme, scheme, customThemes],
	);

	const visuals = useMemo(
		() => resolveThemeVisuals(triplets, scheme),
		[triplets, scheme],
	);

	const setMode = useCallback((next: ThemeMode) => {
		setModeState(next);
		kvSet(MODE_KEY, next);
	}, []);

	const setActiveTheme = useCallback(
		(value: string) => {
			setActiveThemeState(value);
			kvSet(ACTIVE_KEY, value);
			if (userId) client.theme.setActive({ theme: value }).catch(() => {});
		},
		[userId],
	);

	const ctx = useMemo<ThemeContextValue>(
		() => ({
			mode,
			setMode,
			scheme,
			activeTheme,
			setActiveTheme,
			customThemes,
			refreshCustomThemes,
			colors: visuals.colors,
			gradient: visuals.gradient,
			glow: visuals.glow,
		}),
		[
			mode,
			setMode,
			scheme,
			activeTheme,
			setActiveTheme,
			customThemes,
			refreshCustomThemes,
			visuals,
		],
	);

	const navTheme = useMemo(
		() => buildNavTheme(triplets, scheme),
		[triplets, scheme],
	);

	// Stable identity matters: a fresh vars() object invalidates css-interop's
	// variable context at the root and re-renders every styled component.
	// The backgroundColor here is the app-wide backdrop: it covers the (white)
	// native root view whenever screens detach mid-transition.
	const rootStyle = useMemo(
		() => [
			{ flex: 1, backgroundColor: tripletToHex(triplets.background) },
			vars(tokensToVars(triplets)),
		],
		[triplets],
	);

	return (
		<ThemeContext.Provider value={ctx}>
			<NavThemeProvider value={navTheme}>
				<StatusBar style={scheme === "dark" ? "light" : "dark"} />
				<View style={rootStyle}>{children}</View>
			</NavThemeProvider>
		</ThemeContext.Provider>
	);
}
