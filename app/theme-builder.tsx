import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
	BottomSheetModalProvider,
	BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
	AccessibilityInfo,
	Alert,
	Platform,
	StyleSheet,
	View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	FadeIn,
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Trash2, TriangleAlert } from "@/components/icons";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { ColorPickerRow } from "@/components/theme/color-picker-row";
import { ContrastBadge } from "@/components/theme/contrast-badge";
import { GradientSwatch } from "@/components/theme/gradient-swatch";
import { Button } from "@/components/ui/button";
import { GlowShadow, Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { durations } from "@/lib/motion/springs";
import { client } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import {
	contrastRatio,
	ensureContrast,
	glowColor,
	hexToTriplet,
	readableForeground,
	tripletToHex,
} from "@/lib/theme/color";
import { TYPE } from "@/lib/theme/foundations";
import { PRESETS } from "@/lib/theme/presets";
import { useTheme } from "@/lib/theme/provider";
import { TOKEN_GROUPS, TOKEN_KEYS, type TokenKey } from "@/lib/theme/tokens";

type HexMap = Record<TokenKey, string>;
type Hsl = { h: number; s: number; l: number };
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// WCAG pairs (§4): 4.5 for text, 3 for fills/large text.
const TOKEN_PAIRS: { fg: TokenKey; bg: TokenKey; threshold: number }[] = [
	{ fg: "foreground", bg: "background", threshold: 4.5 },
	{ fg: "card-foreground", bg: "card", threshold: 4.5 },
	{ fg: "popover-foreground", bg: "popover", threshold: 4.5 },
	{ fg: "muted-foreground", bg: "muted", threshold: 4.5 },
	{ fg: "secondary-foreground", bg: "secondary", threshold: 4.5 },
	{ fg: "primary-foreground", bg: "primary", threshold: 3 },
	{ fg: "accent-foreground", bg: "accent", threshold: 3 },
	{ fg: "destructive-foreground", bg: "destructive", threshold: 3 },
];

const HUE_TRACK = [
	"#ff0000",
	"#ffff00",
	"#00ff00",
	"#00ffff",
	"#0000ff",
	"#ff00ff",
	"#ff0000",
] as const;

// Build a complete 22-key hex map, taking valid values from `src` and falling
// back to the headpat preset so the result always satisfies theme.create/update.
function buildHexMap(
	src: Record<string, string> | undefined,
	variant: "light" | "dark",
): HexMap {
	const out = {} as HexMap;
	for (const k of TOKEN_KEYS) {
		const v = src?.[k];
		out[k] =
			v && HEX_RE.test(v) ? v : tripletToHex(PRESETS.headpat[variant][k]);
	}
	return out;
}

// New drafts start a11y-clean: the headpat preset misses WCAG on a few pairs,
// so repair the seeded foregrounds. Editing never rewrites saved colors.
function accessibleSeed(variant: "light" | "dark"): HexMap {
	const map = buildHexMap(undefined, variant);
	for (const p of TOKEN_PAIRS) {
		map[p.fg] = ensureContrast(map[p.fg], map[p.bg], p.threshold);
	}
	return map;
}

function hexToHsl(hex: string): Hsl {
	const m = /^([\d.]+) ([\d.]+)% ([\d.]+)%$/.exec(hexToTriplet(hex));
	if (!m) return { h: 0, s: 0, l: 0 };
	return { h: Math.round(+m[1]), s: Math.round(+m[2]), l: Math.round(+m[3]) };
}

function ChannelSlider({
	label,
	value,
	max,
	trackColors,
	onChange,
}: {
	label: string;
	value: number;
	max: number;
	trackColors: readonly [string, string, ...string[]];
	onChange: (value: number) => void;
}) {
	const { colors } = useTheme();
	const [width, setWidth] = useState(0);

	const commit = useCallback(
		(x: number) => {
			if (width <= 0) return;
			const fraction = Math.min(1, Math.max(0, x / width));
			onChange(Math.round(fraction * max));
		},
		[width, max, onChange],
	);

	// activeOffsetX lets the horizontal drag win over the sheet's vertical pan;
	// onBegin doubles as tap-to-set.
	const pan = useMemo(
		() =>
			Gesture.Pan()
				.activeOffsetX([-8, 8])
				.onBegin((e) => {
					runOnJS(commit)(e.x);
				})
				.onUpdate((e) => {
					runOnJS(commit)(e.x);
				}),
		[commit],
	);

	const fraction = max > 0 ? value / max : 0;
	const step = Math.max(1, Math.round(max / 20));

	return (
		<View
			className="gap-1.5"
			accessible
			accessibilityRole="adjustable"
			accessibilityLabel={label}
			accessibilityValue={{ min: 0, max, now: value }}
			accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
			onAccessibilityAction={(e) => {
				if (e.nativeEvent.actionName === "increment")
					onChange(Math.min(max, value + step));
				else if (e.nativeEvent.actionName === "decrement")
					onChange(Math.max(0, value - step));
			}}
		>
			<View className="flex-row justify-between">
				<Text variant="small" className="text-muted-foreground">
					{label}
				</Text>
				<Text variant="small" className="text-muted-foreground">
					{value}
				</Text>
			</View>
			<GestureDetector gesture={pan}>
				<View
					style={{ height: 36, justifyContent: "center" }}
					onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
				>
					<Gradient
						colors={trackColors}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 0 }}
						borderRadius={10}
						style={{ height: 20 }}
						pointerEvents="none"
					/>
					<View
						pointerEvents="none"
						style={{
							position: "absolute",
							left: Math.max(0, Math.min(width - 28, fraction * width - 14)),
							width: 28,
							height: 28,
							borderRadius: 14,
							borderWidth: 3,
							borderColor: colors.background,
							backgroundColor: colors.foreground,
							boxShadow: "0 2 6 rgba(0, 0, 0, 0.3)",
						}}
					/>
				</View>
			</GestureDetector>
		</View>
	);
}

// Live mini-UI rendered straight from the draft hex map — the only literal
// colors here are the user's own.
function Preview({
	hex,
	name,
	scheme,
	failing,
}: {
	hex: HexMap;
	name: string;
	scheme: "light" | "dark";
	failing: Set<TokenKey>;
}) {
	const { t } = useI18n();
	const glow = glowColor(hexToTriplet(hex.primary), scheme);
	const underline = (key: TokenKey) =>
		failing.has(key) ? ({ textDecorationLine: "underline" } as const) : null;
	return (
		<View style={GlowShadow(glow)}>
			<GradientSwatch
				primary={hex.primary}
				accent={hex.accent}
				scheme={scheme}
				borderRadius={20}
				style={{ padding: 10, overflow: "hidden" }}
			>
				<View
					style={{
						backgroundColor: hex.background,
						borderRadius: 14,
						padding: 16,
						gap: 12,
					}}
				>
					<Text
						numberOfLines={1}
						style={[
							TYPE.h2,
							{ color: hex.foreground },
							underline("foreground"),
						]}
					>
						{name || t("themeBuilder.preview")}
					</Text>
					<View
						style={{
							backgroundColor: hex.card,
							borderColor: hex.border,
							borderWidth: 1,
							borderRadius: 12,
							padding: 12,
							gap: 8,
						}}
					>
						<Text
							style={[
								{ color: hex["card-foreground"] },
								underline("card-foreground"),
							]}
						>
							{t("themeBuilder.previewCard")}
						</Text>
						<Text
							className="text-sm"
							style={[
								{ color: hex["muted-foreground"] },
								underline("muted-foreground"),
							]}
						>
							{t("themeBuilder.previewMuted")}
						</Text>
						<View className="flex-row items-center gap-2 pt-1">
							<View
								style={{
									backgroundColor: hex.primary,
									borderRadius: 10,
									paddingHorizontal: 12,
									paddingVertical: 8,
									flexDirection: "row",
									alignItems: "center",
									gap: 6,
								}}
							>
								<Text
									className="text-sm font-medium"
									style={[
										{ color: hex["primary-foreground"] },
										underline("primary-foreground"),
									]}
								>
									{t("themeBuilder.previewPrimary")}
								</Text>
								<ContrastBadge
									fg={hex["primary-foreground"]}
									bg={hex.primary}
									threshold={3}
									solid
								/>
							</View>
							<View
								style={{
									backgroundColor: hex.accent,
									borderRadius: 10,
									paddingHorizontal: 12,
									paddingVertical: 8,
									flexDirection: "row",
									alignItems: "center",
									gap: 6,
								}}
							>
								<Text
									className="text-sm font-medium"
									style={[
										{ color: hex["accent-foreground"] },
										underline("accent-foreground"),
									]}
								>
									{t("themeBuilder.previewAccent")}
								</Text>
								<ContrastBadge
									fg={hex["accent-foreground"]}
									bg={hex.accent}
									threshold={3}
									solid
								/>
							</View>
						</View>
					</View>
				</View>
			</GradientSwatch>
		</View>
	);
}

export default function ThemeBuilder() {
	const insets = useSafeAreaInsets();
	const { t } = useI18n();
	const reduced = useReducedMotion();
	const { colors } = useTheme();
	const { id } = useLocalSearchParams<{ id?: string }>();
	const { customThemes, refreshCustomThemes, setActiveTheme } = useTheme();
	const { data: session } = useSession();
	const editing = id ? customThemes.find((th) => th.id === id) : undefined;

	const [name, setName] = useState(
		editing?.name ?? t("themeBuilder.defaultName"),
	);
	const [variant, setVariant] = useState<"light" | "dark">("light");
	const [light, setLight] = useState<HexMap>(() =>
		editing ? buildHexMap(editing.light, "light") : accessibleSeed("light"),
	);
	const [dark, setDark] = useState<HexMap>(() =>
		editing ? buildHexMap(editing.dark, "dark") : accessibleSeed("dark"),
	);
	const [busy, setBusy] = useState(false);

	const confirmPulse = useSharedValue(0);
	const confirmStyle = useAnimatedStyle(() => ({
		opacity: confirmPulse.value,
	}));

	const sheetRef = useRef<BottomSheetModal>(null);
	const [pickerToken, setPickerToken] = useState<TokenKey | null>(null);
	const [hsl, setHsl] = useState<Hsl>({ h: 0, s: 0, l: 0 });
	const [hexField, setHexField] = useState("#000000");

	const draft = variant === "light" ? light : dark;

	// Latest-value refs keep openPicker/applyHsl stable so the 22 memoized
	// ColorPickerRows don't all re-render on every keystroke.
	const lightRef = useRef(light);
	lightRef.current = light;
	const darkRef = useRef(dark);
	darkRef.current = dark;
	const variantRef = useRef(variant);
	variantRef.current = variant;
	const pickerTokenRef = useRef(pickerToken);
	pickerTokenRef.current = pickerToken;
	const hslRef = useRef(hsl);
	hslRef.current = hsl;

	const setToken = useCallback(
		(key: TokenKey, value: string) => {
			const setter = variant === "light" ? setLight : setDark;
			setter((prev) => ({ ...prev, [key]: value }));
		},
		[variant],
	);

	const openPicker = useCallback((key: TokenKey) => {
		const map =
			variantRef.current === "light" ? lightRef.current : darkRef.current;
		const seed = HEX_RE.test(map[key]) ? map[key] : "#000000";
		setHsl(hexToHsl(seed));
		setHexField(seed);
		setPickerToken(key);
		sheetRef.current?.present();
	}, []);

	const applyHsl = useCallback(
		(next: Hsl) => {
			setHsl(next);
			const hex = tripletToHex(`${next.h} ${next.s}% ${next.l}%`);
			setHexField(hex);
			const key = pickerTokenRef.current;
			if (key) setToken(key, hex);
		},
		[setToken],
	);

	const onHue = useCallback(
		(v: number) => applyHsl({ ...hslRef.current, h: v }),
		[applyHsl],
	);
	const onSat = useCallback(
		(v: number) => applyHsl({ ...hslRef.current, s: v }),
		[applyHsl],
	);
	const onLight = useCallback(
		(v: number) => applyHsl({ ...hslRef.current, l: v }),
		[applyHsl],
	);

	const onHexField = (text: string) => {
		setHexField(text);
		if (HEX_RE.test(text)) {
			setHsl(hexToHsl(text));
			const key = pickerTokenRef.current;
			if (key) setToken(key, text);
		}
	};

	const valid = useMemo(
		() =>
			name.trim().length > 0 &&
			TOKEN_KEYS.every((k) => HEX_RE.test(light[k]) && HEX_RE.test(dark[k])),
		[name, light, dark],
	);

	const contrast = useMemo(() => {
		const out = new Map<
			TokenKey,
			{ bg: TokenKey; threshold: number; ratio: number }
		>();
		for (const p of TOKEN_PAIRS) {
			const fg = draft[p.fg];
			const bg = draft[p.bg];
			if (HEX_RE.test(fg) && HEX_RE.test(bg)) {
				out.set(p.fg, {
					bg: p.bg,
					threshold: p.threshold,
					ratio: contrastRatio(hexToTriplet(fg), hexToTriplet(bg)),
				});
			}
		}
		return out;
	}, [draft]);

	const failingSet = useMemo(() => {
		const out = new Set<TokenKey>();
		for (const [key, info] of contrast)
			if (info.ratio < info.threshold) out.add(key);
		return out;
	}, [contrast]);

	const save = async () => {
		if (!session?.user) {
			router.push("/(auth)/login");
			return;
		}
		setBusy(true);
		try {
			if (editing) {
				await client.theme.update({
					id: editing.id,
					name: name.trim(),
					light,
					dark,
				});
			} else {
				const created = await client.theme.create({
					name: name.trim(),
					light,
					dark,
				});
				setActiveTheme(`custom:${created.id}`);
			}
			await refreshCustomThemes();
			if (Platform.OS !== "web")
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			AccessibilityInfo.announceForAccessibility(t("themeBuilder.saved"));
			if (!reduced) {
				// spec §12: brief gradient confirm pulse on the preview before leaving
				confirmPulse.value = 0.7;
				confirmPulse.value = withTiming(0, { duration: 250 });
				await new Promise<void>((resolve) => setTimeout(resolve, 250));
			}
			router.back();
		} catch (e) {
			Alert.alert(t("themeBuilder.saveError"), humanizeError(e));
		} finally {
			setBusy(false);
		}
	};

	const remove = () => {
		if (!session?.user) {
			router.push("/(auth)/login");
			return;
		}
		if (!editing) return;
		Alert.alert(
			t("themeBuilder.deleteTitle"),
			t("themeBuilder.deleteConfirm", { name: editing.name }),
			[
				{ text: t("common.cancel"), style: "cancel" },
				{
					text: t("common.delete"),
					style: "destructive",
					onPress: async () => {
						try {
							await client.theme.delete({ id: editing.id });
							await refreshCustomThemes();
							router.back();
						} catch (e) {
							Alert.alert(t("themeBuilder.deleteError"), humanizeError(e));
						}
					},
				},
			],
		);
	};

	const variantTabs = [
		{ key: "light", label: t("themeBuilder.light") },
		{ key: "dark", label: t("themeBuilder.dark") },
	];

	return (
		// Screen-local sheet host. The root provider (app/_layout.tsx) lives above
		// the Stack, so on iOS its container sits behind this modally-presented
		// screen and any sheet opened here would render underneath it.
		<BottomSheetModalProvider>
			<View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
				<KeyboardAwareScrollView
					contentContainerStyle={{
						padding: 16,
						paddingBottom: insets.bottom + 120,
						gap: 20,
					}}
				>
					<AnimatedEntrance index={0} className="gap-2">
						<Text variant="caption" accessibilityRole="header">
							{t("themeBuilder.name")}
						</Text>
						<Input
							value={name}
							onChangeText={setName}
							maxLength={60}
							accessibilityLabel={t("themeBuilder.nameA11y")}
						/>
					</AnimatedEntrance>

					<AnimatedEntrance index={1}>
						<Animated.View
							key={variant}
							entering={reduced ? undefined : FadeIn.duration(durations.base)}
						>
							<Preview
								hex={draft}
								name={name}
								scheme={variant}
								failing={failingSet}
							/>
						</Animated.View>
						<Animated.View
							pointerEvents="none"
							style={[StyleSheet.absoluteFill, confirmStyle]}
						>
							<GradientSwatch
								primary={draft.primary}
								accent={draft.accent}
								scheme={variant}
								borderRadius={20}
								style={StyleSheet.absoluteFill}
							/>
						</Animated.View>
					</AnimatedEntrance>

					<AnimatedEntrance index={2}>
						<SegmentedTabs
							tabs={variantTabs}
							value={variant}
							onChange={(key) => setVariant(key as "light" | "dark")}
						/>
					</AnimatedEntrance>

					{TOKEN_GROUPS.map((group, groupIndex) => (
						<AnimatedEntrance
							key={group.label}
							index={3 + groupIndex}
							className="gap-2"
						>
							<Text variant="caption" accessibilityRole="header">
								{t(`themeBuilder.groups.${group.label.toLowerCase()}`)}
							</Text>
							{group.label === "Brand" ? (
								<View className="gap-1.5 pb-1">
									<GradientSwatch
										primary={draft.primary}
										accent={draft.accent}
										scheme={variant}
										borderRadius={3}
										style={{ height: 6 }}
									/>
									<Text variant="muted" className="text-xs">
										{t("themeBuilder.brandHint")}
									</Text>
								</View>
							) : null}
							{group.keys.map((key) => {
								const info = contrast.get(key);
								const fails = info ? info.ratio < info.threshold : false;
								return (
									<View key={key} className="gap-1.5">
										<ColorPickerRow
											token={key}
											value={draft[key]}
											onChangeToken={setToken}
											onPick={openPicker}
											contrastBg={info ? draft[info.bg] : undefined}
											threshold={info?.threshold}
										/>
										{info && fails ? (
											<View className="flex-row items-center gap-2 pl-1">
												<View
													className="flex-1 flex-row items-center gap-1.5"
													accessibilityRole="alert"
												>
													<Icon
														as={TriangleAlert}
														size={14}
														className="text-destructive"
													/>
													<Text
														variant="small"
														className="text-destructive flex-1"
													>
														{t("themeBuilder.contrastWarning", {
															token: info.bg,
															ratio: info.ratio.toFixed(1),
															needs: String(info.threshold),
														})}
													</Text>
												</View>
												<PressableScale
													onPress={() =>
														setToken(
															key,
															tripletToHex(
																readableForeground(
																	hexToTriplet(draft[info.bg]),
																),
															),
														)
													}
													accessibilityRole="button"
													accessibilityLabel={t(
														"themeBuilder.useReadableA11y",
														{
															token: key,
														},
													)}
													style={{
														minHeight: 44,
														justifyContent: "center",
														paddingHorizontal: 4,
													}}
												>
													<Text className="text-primary text-sm font-medium">
														{t("themeBuilder.useReadable")}
													</Text>
												</PressableScale>
											</View>
										) : null}
									</View>
								);
							})}
						</AnimatedEntrance>
					))}
				</KeyboardAwareScrollView>

				<View
					className="border-border bg-background gap-2 border-t p-4"
					style={{ paddingBottom: insets.bottom + 12 }}
				>
					{failingSet.size > 0 ? (
						<Text variant="muted" accessibilityRole="alert">
							{t("themeBuilder.contrastSummary", { count: failingSet.size })}
						</Text>
					) : null}
					<View className="flex-row gap-3">
						{editing ? (
							<Button
								variant="outline"
								onPress={remove}
								accessibilityLabel={t("themeBuilder.deleteA11y")}
								className="aspect-square p-0"
							>
								<Icon as={Trash2} size={20} className="text-destructive" />
							</Button>
						) : null}
						<Button
							disabled={!valid || busy}
							onPress={save}
							className="flex-1"
							accessibilityLabel={t("themeBuilder.save")}
						>
							<Text>
								{busy ? t("themeBuilder.saving") : t("themeBuilder.save")}
							</Text>
						</Button>
					</View>
				</View>

				<Sheet ref={sheetRef} title={pickerToken ?? ""} accent>
					<View className="gap-4 pb-2">
						<View className="flex-row items-center gap-3">
							<View
								accessible={false}
								style={{
									width: 56,
									height: 44,
									borderRadius: 12,
									backgroundColor: HEX_RE.test(hexField) ? hexField : "#000000",
									borderWidth: 1,
									borderColor: colors.border,
								}}
							/>
							<BottomSheetTextInput
								value={hexField}
								onChangeText={onHexField}
								autoCapitalize="none"
								autoCorrect={false}
								accessibilityLabel={
									pickerToken
										? t("themeBuilder.hexA11y", { token: pickerToken })
										: undefined
								}
								style={{
									flex: 1,
									height: 44,
									borderRadius: 12,
									borderWidth: 1,
									borderColor: HEX_RE.test(hexField)
										? colors.border
										: colors.destructive,
									paddingHorizontal: 12,
									color: colors.foreground,
									fontSize: 16,
								}}
								placeholder="#000000"
								placeholderTextColor={colors["muted-foreground"]}
							/>
						</View>
						<ChannelSlider
							label={t("themeBuilder.hue")}
							value={hsl.h}
							max={360}
							trackColors={HUE_TRACK}
							onChange={onHue}
						/>
						<ChannelSlider
							label={t("themeBuilder.saturation")}
							value={hsl.s}
							max={100}
							trackColors={
								[
									tripletToHex(`${hsl.h} 0% ${hsl.l}%`),
									tripletToHex(`${hsl.h} 100% ${hsl.l}%`),
								] as const
							}
							onChange={onSat}
						/>
						<ChannelSlider
							label={t("themeBuilder.lightness")}
							value={hsl.l}
							max={100}
							trackColors={
								[
									"#000000",
									tripletToHex(`${hsl.h} ${hsl.s}% 50%`),
									"#ffffff",
								] as const
							}
							onChange={onLight}
						/>
						<Button
							variant="outline"
							onPress={() => sheetRef.current?.dismiss()}
							accessibilityLabel={t("themeBuilder.done")}
						>
							<Text>{t("themeBuilder.done")}</Text>
						</Button>
					</View>
				</Sheet>
			</View>
		</BottomSheetModalProvider>
	);
}
