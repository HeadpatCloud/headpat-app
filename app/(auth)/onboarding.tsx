import * as Haptics from "expo-haptics";
import { Link, router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
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
	interpolate,
	type SharedValue,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Aurora } from "@/components/brand/aurora";
import { HeadpatLogo } from "@/components/brand/logo";
import { ChevronLeft, ChevronRight, Moon, Sun } from "@/components/icons";
import { LegalLinks } from "@/components/legal-links";
import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/ui/gradient-text";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { kvSet } from "@/lib/db/kv";
import { useI18n } from "@/lib/i18n/provider";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { tripletToHex } from "@/lib/theme/color";
import { PRESET_LIST, PRESETS } from "@/lib/theme/presets";
import { useTheme } from "@/lib/theme/provider";
import { useEula } from "@/lib/use-eula";

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
	kvSet(ONBOARDED_KEY, "1");
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
	const { t } = useI18n();
	const tokens = PRESETS[slug][scheme];
	const selected = activeTheme === slug;
	return (
		<Pressable
			onPress={() => setActiveTheme(slug)}
			accessibilityRole="button"
			accessibilityState={{ selected }}
			accessibilityLabel={t("appearance.themeA11y", { name })}
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
				<Dot
					key={i}
					index={i}
					scrollX={scrollX}
					width={width}
					colors={colors}
				/>
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
		return {
			width: 8 + active * 12,
			backgroundColor:
				active > 0.5 ? colors.primary : colors["muted-foreground"],
			opacity: 0.5 + active * 0.5,
		};
	});
	return <Animated.View style={style} className="h-2 rounded-full" />;
}

function NavArrow({
	dir,
	visible,
	hint,
	label,
	onPress,
}: {
	dir: "prev" | "next";
	visible: boolean;
	hint: boolean;
	label: string;
	onPress: () => void;
}) {
	// Loop a small horizontal nudge in the swipe direction so the arrow reads as
	// "you can also swipe", not just a tap target.
	const nudge = useSharedValue(0);
	useEffect(() => {
		if (!hint) {
			nudge.value = withTiming(0, { duration: 150 });
			return;
		}
		nudge.value = withRepeat(
			withSequence(
				withTiming(dir === "next" ? 5 : -5, { duration: 650 }),
				withTiming(0, { duration: 650 }),
			),
			-1,
			false,
		);
	}, [hint, dir, nudge]);
	const style = useAnimatedStyle(() => ({
		transform: [{ translateX: nudge.value }],
	}));

	if (!visible) return <View className="h-10 w-10" />;
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={label}
			hitSlop={12}
			className="border-border bg-card/80 h-10 w-10 items-center justify-center rounded-full border"
		>
			<Animated.View style={style}>
				<Icon
					as={dir === "next" ? ChevronRight : ChevronLeft}
					size={22}
					className="text-foreground"
				/>
			</Animated.View>
		</Pressable>
	);
}

export default function Onboarding() {
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const reduced = useReducedMotion();
	const { t } = useI18n();
	const { scheme, setMode, colors } = useTheme();
	const { accepted, accept } = useEula();
	const scrollX = useSharedValue(0);
	const scrollRef = useRef<Animated.ScrollView>(null);
	const [page, setPage] = useState(0);
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

	const goTo = useCallback(
		(i: number) => {
			const next = Math.max(0, Math.min(PANELS - 1, i));
			if (Platform.OS !== "web") Haptics.selectionAsync();
			scrollRef.current?.scrollTo({ x: next * width, animated: true });
			setPage(next);
		},
		[width],
	);

	const logoStyle = useAnimatedStyle(() => {
		if (reduced) return {};
		return {
			transform: [
				{
					translateX: interpolate(scrollX.value, [0, width], [0, width * 0.25]),
				},
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
					accessibilityLabel={t("header.toggleMode")}
				>
					<Icon
						as={scheme === "dark" ? Sun : Moon}
						size={20}
						className="text-foreground"
					/>
				</Button>
				{accepted ? (
					<Button
						variant="ghost"
						size="sm"
						onPress={finishOnboarding}
						accessibilityRole="button"
						accessibilityLabel={t("auth.onboarding.skipA11y")}
					>
						<Text>{t("auth.onboarding.skip")}</Text>
					</Button>
				) : null}
			</View>

			<AnimatedScrollView
				ref={scrollRef}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onScroll={scrollHandler}
				onMomentumScrollEnd={onMomentumEnd}
				scrollEventThrottle={16}
				scrollEnabled={accepted}
				className="flex-1"
			>
				<Panel width={width}>
					<Animated.View style={logoStyle} className="items-center">
						<HeadpatLogo
							size={112}
							accessibilityLabel={t("auth.onboarding.logoA11y")}
						/>
					</Animated.View>
					<View className="items-center gap-3">
						<GradientText className="text-center">
							{t("auth.onboarding.slide1Title")}
						</GradientText>
						<Text variant="muted" className="text-center">
							{t("auth.onboarding.slide1Body")}
						</Text>
					</View>
					{!accepted ? (
						<View className="border-primary/30 bg-card/80 w-full gap-3 rounded-2xl border p-4">
							<Text variant="muted" className="text-sm">
								{t("eula.consentIntro")}
							</Text>
							<LegalLinks />
							<Button
								size="lg"
								fullWidth
								onPress={() => {
									accept();
									scrollRef.current?.scrollTo({ x: width, animated: true });
								}}
								accessibilityRole="button"
								accessibilityLabel={t("eula.agree")}
							>
								<Text>{t("eula.agree")}</Text>
							</Button>
						</View>
					) : null}
				</Panel>

				<Panel width={width}>
					<View className="items-center gap-3">
						<GradientText className="text-center">
							{t("auth.onboarding.slide2Title")}
						</GradientText>
						<Text variant="muted" className="text-center">
							{t("auth.onboarding.slide2Body")}
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
							{t("auth.onboarding.slide3Title")}
						</GradientText>
						<Text variant="muted" className="text-center">
							{t("auth.onboarding.slide3Body")}
						</Text>
					</View>
					<View className="w-full gap-3">
						<Button
							variant="default"
							size="lg"
							fullWidth
							onPress={finishOnboarding}
							accessibilityRole="button"
							accessibilityLabel={t("auth.onboarding.continue")}
						>
							<Text>{t("auth.onboarding.continue")}</Text>
						</Button>
						<Link href="/(auth)/login" asChild>
							<Button
								variant="link"
								onPress={() => {
									kvSet(ONBOARDED_KEY, "1");
								}}
								accessibilityRole="link"
								accessibilityLabel={t("auth.onboarding.haveAccount")}
							>
								<Text>{t("auth.onboarding.haveAccount")}</Text>
							</Button>
						</Link>
					</View>
				</Panel>
			</AnimatedScrollView>

			<View
				className="flex-row items-center justify-between px-6 pt-4"
				style={{ paddingBottom: insets.bottom > 0 ? 8 : 24 }}
			>
				<NavArrow
					dir="prev"
					visible={accepted && page > 0}
					hint={false}
					label={t("auth.onboarding.prevA11y")}
					onPress={() => goTo(page - 1)}
				/>
				<Dots scrollX={scrollX} width={width} />
				<NavArrow
					dir="next"
					visible={accepted && page < PANELS - 1}
					hint={accepted && page < PANELS - 1 && !reduced}
					label={t("auth.onboarding.nextA11y")}
					onPress={() => goTo(page + 1)}
				/>
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
