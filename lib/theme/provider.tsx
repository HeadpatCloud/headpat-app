import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	DarkTheme,
	DefaultTheme,
	type Theme as NavTheme,
	ThemeProvider as NavThemeProvider,
} from "expo-router/react-navigation";
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
import { client } from "@/lib/orpc";
import { hexToTriplet, tokensToVars } from "@/lib/theme/color";
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
			background: `hsl(${triplets.background})`,
			card: `hsl(${triplets.card})`,
			text: `hsl(${triplets.foreground})`,
			border: `hsl(${triplets.border})`,
			primary: `hsl(${triplets.primary})`,
			notification: `hsl(${triplets.destructive})`,
		},
	};
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const device = useDeviceScheme();
	const [mode, setModeState] = useState<ThemeMode>("system");
	const [activeTheme, setActiveThemeState] = useState<string>("headpat");
	const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
	const { data: session } = authClient.useSession();

	// Hydrate cached prefs once (pre-paint before the server responds).
	useEffect(() => {
		(async () => {
			const [m, a, c] = await Promise.all([
				AsyncStorage.getItem(MODE_KEY),
				AsyncStorage.getItem(ACTIVE_KEY),
				AsyncStorage.getItem(CUSTOM_KEY),
			]);
			if (m === "light" || m === "dark" || m === "system") setModeState(m);
			if (a) setActiveThemeState(a);
			if (c) {
				try {
					setCustomThemes(JSON.parse(c));
				} catch {}
			}
		})();
	}, []);

	const refreshCustomThemes = useCallback(async () => {
		try {
			const rows = (await client.theme.myThemes({})) as CustomTheme[];
			setCustomThemes(rows);
			await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(rows));
		} catch {}
	}, []);

	// On sign-in, the account is the source of truth for the active theme.
	useEffect(() => {
		if (!session) return;
		(async () => {
			try {
				const me = await client.profile.me({});
				if (me?.activeTheme) {
					setActiveThemeState(me.activeTheme);
					await AsyncStorage.setItem(ACTIVE_KEY, me.activeTheme);
				}
			} catch {}
			await refreshCustomThemes();
		})();
	}, [session, refreshCustomThemes]);

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
		AsyncStorage.setItem(MODE_KEY, next).catch(() => {});
	}, []);

	const setActiveTheme = useCallback(
		(value: string) => {
			setActiveThemeState(value);
			AsyncStorage.setItem(ACTIVE_KEY, value).catch(() => {});
			if (session) client.theme.setActive({ theme: value }).catch(() => {});
		},
		[session],
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

	return (
		<ThemeContext.Provider value={ctx}>
			<NavThemeProvider value={navTheme}>
				<StatusBar style={scheme === "dark" ? "light" : "dark"} />
				<View style={[{ flex: 1 }, vars(tokensToVars(triplets))]}>
					{children}
				</View>
			</NavThemeProvider>
		</ThemeContext.Provider>
	);
}
