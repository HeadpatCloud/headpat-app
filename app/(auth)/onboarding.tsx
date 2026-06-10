import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Link, router } from "expo-router";
import { Moon, Sun } from "@/components/icons";
import { useCallback, useRef, useState } from "react";
import {
	Image,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	Platform,
	Pressable,
	StyleSheet,
	useWindowDimensions,
	View,
} from "react-native";
import Animated, {
	Extrapolation,
	type SharedValue,
	interpolate,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Aurora } from "@/components/brand/aurora";
import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/ui/gradient-text";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { tripletToHex } from "@/lib/theme/color";
import { PRESET_LIST, PRESETS } from "@/lib/theme/presets";
import { useTheme } from "@/lib/theme/provider";

const ONBOARDED_KEY = "hp-onboarded";
const SWATCH_KEYS = ["primary", "accent", "background"] as const;
const PANELS = 3;

const AnimatedScrollView = Animated.ScrollView;

// The theme exposes space-syntax hsl; RN parses comma-syntax everywhere, so
// normalize before handing a color to a raw (non-className) style.
function commaHsl(hsl: string): string {
	return hsl.replace(
		/hsl\(([\d.]+)\s+([\d.]+%)\s+([\d.]+%)\)/,
		"hsl($1, $2, $3)",
	);
}

function finishOnboarding() {
	AsyncStorage.setItem(ONBOARDED_KEY, "1").catch(() => {});
	router.replace("/(auth)/welcome");
}

function Panel({
	width,
	children,
}: {
	width: number;
	children: React.ReactNode;
}) {
	return (
		<View
			style={{ width }}
			className="flex-1 items-center justify-center gap-6 px-6"
		>
			{children}
		</View>
	);
}

function SwatchChip({
	slug,
	name,
}: {
	slug: (typeof PRESET_LIST)[number]["slug"];
	name: string;
}) {
	const { scheme, activeTheme, setActiveTheme } = useTheme();
	const tokens = PRESETS[slug][scheme];
	const selected = activeTheme === slug;
	return (
		<Pressable
			onPress={() => setActiveTheme(slug)}
			accessibilityRole="button"
			accessibilityState={{ selected }}
			accessibilityLabel={`${name} theme`}
			hitSlop={8}
			className={`min-h-12 flex-row items-center gap-3 rounded-xl border px-4 py-3 ${selected ? "border-primary bg-primary/10" : "border-border bg-card"}`}
		>
			<View className="flex-row">
				{SWATCH_KEYS.map((key, i) => (
					<View
						key={key}
						style={{
							backgroundColor: tripletToHex(tokens[key]),
							marginLeft: i ? -6 : 0,
						}}
						className="border-border h-6 w-6 rounded-full border"
					/>
				))}
			</View>
			<Text
				className={selected ? "text-primary font-semibold" : "text-foreground"}
			>
				{name}
			</Text>
		</Pressable>
	);
}

function Dots({
	scrollX,
	width,
}: {
	scrollX: SharedValue<number>;
	width: number;
}) {
	const { colors } = useTheme();
	return (
		<View className="flex-row items-center justify-center gap-2">
			{Array.from({ length: PANELS }).map((_, i) => (
				<Dot key={i} index={i} scrollX={scrollX} width={width} colors={colors} />
			))}
		</View>
	);
}

function Dot({
	index,
	scrollX,
	width,
	colors,
}: {
	index: number;
	scrollX: SharedValue<number>;
	width: number;
	colors: ReturnType<typeof useTheme>["colors"];
}) {
	const style = useAnimatedStyle(() => {
		const active = interpolate(
			scrollX.value,
			[(index - 1) * width, index * width, (index + 1) * width],
			[0, 1, 0],
			Extrapolation.CLAMP,
		);
		// No withSpring here: spawning a spring per scroll frame (and animating
		// layout `width`) janks the swipe on slower phones.
		return {
			width: 8 + active * 12,
			backgroundColor: active > 0.5 ? colors.primary : colors.muted,
			opacity: 0.4 + active * 0.6,
		};
	});
	return <Animated.View style={style} className="h-2 rounded-full" />;
}

export default function Onboarding() {
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const reduced = useReducedMotion();
	const { scheme, setMode, colors } = useTheme();
	const scrollX = useSharedValue(0);
	const scrollRef = useRef<Animated.ScrollView>(null);
	const [, setPage] = useState(0);
	const [veilColor, setVeilColor] = useState<string | null>(null);
	const veil = useSharedValue(0);

	const toggleMode = () => {
		if (Platform.OS !== "web") Haptics.selectionAsync();
		// Cross-fade: cover the screen in the OLD background, then fade it out to
		// reveal the new mode underneath.
		if (!reduced) {
			setVeilColor(commaHsl(colors.background));
			veil.value = 1;
			veil.value = withTiming(0, { duration: 420 });
		}
		setMode(scheme === "dark" ? "light" : "dark");
	};

	const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));

	const scrollHandler = useAnimatedScrollHandler({
		onScroll: (e) => {
			scrollX.value = e.contentOffset.x;
		},
	});

	const onMomentumEnd = useCallback(
		(e: NativeSyntheticEvent<NativeScrollEvent>) => {
			setPage(Math.round(e.nativeEvent.contentOffset.x / width));
		},
		[width],
	);

	const logoStyle = useAnimatedStyle(() => {
		if (reduced) return {};
		return {
			transform: [
				{ translateX: interpolate(scrollX.value, [0, width], [0, width * 0.25]) },
			],
		};
	});

	return (
		<View
			className="bg-background flex-1"
			style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
		>
			<Aurora />

			<View className="flex-row items-center justify-between px-6 pt-2">
				<Button
					variant="ghost"
					size="icon"
					onPress={toggleMode}
					accessibilityRole="button"
					accessibilityLabel="Toggle light or dark mode"
				>
					<Icon
						as={scheme === "dark" ? Sun : Moon}
						size={20}
						className="text-foreground"
					/>
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onPress={finishOnboarding}
					accessibilityRole="button"
					accessibilityLabel="Skip onboarding"
				>
					<Text>Skip</Text>
				</Button>
			</View>

			<AnimatedScrollView
				ref={scrollRef}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onScroll={scrollHandler}
				onMomentumScrollEnd={onMomentumEnd}
				scrollEventThrottle={16}
				className="flex-1"
			>
				<Panel width={width}>
					<Animated.View style={logoStyle} className="items-center">
						<Image
							source={require("../../assets/images/headpat_logo.png")}
							style={{ width: 112, height: 112 }}
							resizeMode="contain"
							accessibilityRole="image"
							accessibilityLabel="Headpat logo"
						/>
					</Animated.View>
					<View className="items-center gap-3">
						<GradientText className="text-center">
							Your cozy corner of the community
						</GradientText>
						<Text variant="muted" className="text-center">
							Events, galleries, and friends — all in one warm place.
						</Text>
					</View>
				</Panel>

				<Panel width={width}>
					<View className="items-center gap-3">
						<GradientText className="text-center">Make it yours</GradientText>
						<Text variant="muted" className="text-center">
							Pick a theme and watch everything recolor instantly.
						</Text>
					</View>
					<View className="w-full gap-3">
						{PRESET_LIST.map((p) => (
							<SwatchChip key={p.slug} slug={p.slug} name={p.name} />
						))}
					</View>
				</Panel>

				<Panel width={width}>
					<View className="items-center gap-3">
						<GradientText className="text-center">
							Ready when you are
						</GradientText>
						<Text variant="muted" className="text-center">
							Jump in and make Headpat your own.
						</Text>
					</View>
					<View className="w-full gap-3">
						<Button
							variant="default"
							size="lg"
							fullWidth
							onPress={finishOnboarding}
							accessibilityRole="button"
							accessibilityLabel="Continue"
						>
							<Text>Continue</Text>
						</Button>
						<Link href="/(auth)/login" asChild>
							<Button
								variant="link"
								onPress={() => {
									AsyncStorage.setItem(ONBOARDED_KEY, "1").catch(() => {});
								}}
								accessibilityRole="link"
								accessibilityLabel="I already have an account"
							>
								<Text>I already have an account</Text>
							</Button>
						</Link>
					</View>
				</Panel>
			</AnimatedScrollView>

			<View
				className="px-6 pt-4"
				style={{ paddingBottom: insets.bottom > 0 ? 8 : 24 }}
			>
				<Dots scrollX={scrollX} width={width} />
			</View>

			{veilColor ? (
				<Animated.View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFill,
						{ backgroundColor: veilColor },
						veilStyle,
					]}
				/>
			) : null}
		</View>
	);
}
