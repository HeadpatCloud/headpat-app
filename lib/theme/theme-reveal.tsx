import MaskedView from "@react-native-masked-view/masked-view";
import {
	type ComponentType,
	createContext,
	type ReactElement,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Image,
	StyleSheet,
	useColorScheme,
	useWindowDimensions,
	View,
	type ViewProps,
} from "react-native";
import Animated, {
	Easing,
	useAnimatedProps,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { captureScreen, releaseCapture } from "react-native-view-shot";
import { scheduleOnRN } from "react-native-worklets";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { type ThemeMode, useTheme } from "@/lib/theme/provider";

// The website's theme switch: the new theme grows out of the toggle as a
// circle until it covers the screen (it uses a view transition with a
// clip-path). Native has no view transitions, so this screenshots the current
// screen, lays the picture on top, switches the theme underneath, and then cuts
// a growing circular hole into the picture.

const DURATION = 700;

type Origin = { x: number; y: number };
type Reveal = {
	uri: string;
	x: number;
	y: number;
	max: number;
	mode: ThemeMode;
	next: "light" | "dark";
};

type RevealApi = {
	toggle: (origin?: Origin) => void;
	changeMode: (mode: ThemeMode, origin?: Origin) => void;
};

const ThemeRevealContext = createContext<RevealApi>({
	toggle: () => {},
	changeMode: () => {},
});

/** Toggle light/dark with the circular reveal, starting at `origin`. */
export function useThemeToggle(): RevealApi["toggle"] {
	return useContext(ThemeRevealContext).toggle;
}

/** Switch to a mode (system/light/dark), with the reveal if the colours change. */
export function useThemeModeChange(): RevealApi["changeMode"] {
	return useContext(ThemeRevealContext).changeMode;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

// The package's class typings don't satisfy React 19.3's JSX types; the
// component itself is fine, so give it a plain props signature.
type MaskedViewProps = ViewProps & { maskElement: ReactElement };
const Masked = MaskedView as unknown as ComponentType<MaskedViewProps>;

export function ThemeRevealProvider({ children }: { children: ReactNode }) {
	const { scheme, setMode } = useTheme();
	const reduced = useReducedMotion();
	const device = useColorScheme();
	const { width, height } = useWindowDimensions();
	const [reveal, setReveal] = useState<Reveal | null>(null);
	const [ready, setReady] = useState(false);
	const busy = useRef(false);
	const radius = useSharedValue(0);

	const finish = useCallback((uri: string) => {
		setReveal(null);
		setReady(false);
		busy.current = false;
		releaseCapture(uri);
	}, []);

	const changeMode = useCallback(
		async (mode: ThemeMode, origin?: Origin) => {
			const next =
				mode === "system" ? (device === "dark" ? "dark" : "light") : mode;
			// Same colours (e.g. light -> system on a light phone): nothing to animate.
			if (next === scheme || reduced || busy.current) {
				setMode(mode);
				return;
			}
			busy.current = true;
			try {
				const uri = await captureScreen({
					format: "jpg",
					quality: 0.85,
					result: "tmpfile",
				});
				const x = origin?.x ?? width;
				const y = origin?.y ?? 0;
				radius.value = 0;
				setReveal({
					uri,
					x,
					y,
					max: Math.hypot(Math.max(x, width - x), Math.max(y, height - y)),
					mode,
					next,
				});
			} catch {
				// No screenshot (e.g. a secure screen): switch without the effect.
				busy.current = false;
				setMode(mode);
			}
		},
		[device, scheme, reduced, setMode, width, height, radius],
	);

	const toggle = useCallback(
		(origin?: Origin) =>
			changeMode(scheme === "dark" ? "light" : "dark", origin),
		[changeMode, scheme],
	);

	const api = useMemo(() => ({ toggle, changeMode }), [toggle, changeMode]);

	// Step 2: the picture is on screen, so switch the theme behind it.
	useEffect(() => {
		if (reveal && ready && scheme !== reveal.next) setMode(reveal.mode);
	}, [reveal, ready, scheme, setMode]);

	// Step 3: once the new theme has rendered, open the circle.
	useEffect(() => {
		if (!reveal || !ready || scheme !== reveal.next) return;
		const { uri } = reveal;
		radius.value = withTiming(
			reveal.max,
			{ duration: DURATION, easing: Easing.inOut(Easing.ease) },
			(done) => {
				if (done) scheduleOnRN(finish, uri);
			},
		);
	}, [reveal, ready, scheme, radius, finish]);

	// The picture stays visible everywhere except inside the circle.
	const holeProps = useAnimatedProps(() => {
		const r = radius.value;
		const x = reveal?.x ?? 0;
		const y = reveal?.y ?? 0;
		return {
			d: `M0 0H${width}V${height}H0Z M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`,
		};
	});

	return (
		<ThemeRevealContext.Provider value={api}>
			{children}
			{reveal ? (
				<View
					pointerEvents="none"
					style={StyleSheet.absoluteFill}
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
				>
					<Masked
						style={StyleSheet.absoluteFill}
						maskElement={
							<Svg width={width} height={height}>
								<AnimatedPath
									animatedProps={holeProps}
									fill="black"
									fillRule="evenodd"
								/>
							</Svg>
						}
					>
						<Image
							source={{ uri: reveal.uri }}
							style={{ width, height }}
							fadeDuration={0}
							onLoad={() => setReady(true)}
							onError={() => {
								setMode(reveal.mode);
								finish(reveal.uri);
							}}
						/>
					</Masked>
				</View>
			) : null}
		</ThemeRevealContext.Provider>
	);
}
