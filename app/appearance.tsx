import { router } from "expo-router";
import {
	type ComponentRef,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Pencil, Plus, Trash2 } from "@/components/icons";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { GradientSwatch } from "@/components/theme/gradient-swatch";
import { Button } from "@/components/ui/button";
import { GlowShadow, Gradient } from "@/components/ui/gradient";
import { PageTitle } from "@/components/ui/page-title";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { springs } from "@/lib/motion/springs";
import { client } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { tripletToHex } from "@/lib/theme/color";
import { PRESET_LIST, PRESETS, type PresetSlug } from "@/lib/theme/presets";
import {
	type CustomTheme,
	type ThemeMode,
	useTheme,
} from "@/lib/theme/provider";
import { useThemeModeChange } from "@/lib/theme/theme-reveal";

const SWATCH_KEYS = ["primary", "accent", "background"] as const;

// Glow ring + spring/pulse for the active card; selection state drives only
// raw styles (hex from useTheme), never a scheme-dependent className.
function SelectionRing({
	selected,
	children,
}: {
	selected: boolean;
	children: ReactNode;
}) {
	const { colors, glow } = useTheme();
	const reduced = useReducedMotion();
	const scale = useSharedValue(1);
	const pulse = useSharedValue(0);
	const prev = useRef(selected);

	useEffect(() => {
		if (selected && !prev.current && !reduced) {
			scale.value = 0.97;
			scale.value = withSpring(1, springs.gentle);
			pulse.value = 0.22;
			pulse.value = withTiming(0, { duration: 350 });
		}
		prev.current = selected;
	}, [selected, reduced, scale, pulse]);

	const scaleStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));
	const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

	return (
		<Animated.View
			style={[
				{
					borderWidth: 2,
					borderRadius: 21,
					padding: 3,
					borderColor: selected ? colors.ring : "transparent",
				},
				selected ? GlowShadow(glow) : null,
				scaleStyle,
			]}
		>
			{children}
			<Animated.View
				pointerEvents="none"
				style={[
					StyleSheet.absoluteFill,
					{ margin: 5, borderRadius: 16, backgroundColor: "#ffffff" },
					pulseStyle,
				]}
			/>
		</Animated.View>
	);
}

function PresetCard({
	slug,
	name,
	index,
}: {
	slug: PresetSlug;
	name: string;
	index: number;
}) {
	const { t } = useI18n();
	const { scheme, activeTheme, setActiveTheme } = useTheme();
	const tokens = PRESETS[slug][scheme];
	const selected = activeTheme === slug;
	return (
		<AnimatedEntrance index={index} style={{ flexBasis: "47%", flexGrow: 1 }}>
			<PressableScale
				onPress={() => setActiveTheme(slug)}
				accessibilityRole="button"
				accessibilityState={{ selected }}
				accessibilityLabel={t("appearance.themeA11y", { name })}
			>
				<SelectionRing selected={selected}>
					<GradientSwatch
						primary={tripletToHex(tokens.primary)}
						accent={tripletToHex(tokens.accent)}
						scheme={scheme}
						borderRadius={16}
						style={{
							minHeight: 96,
							justifyContent: "flex-end",
							overflow: "hidden",
						}}
					>
						<Gradient
							colors={["transparent", "rgba(0, 0, 0, 0.45)"]}
							start={{ x: 0, y: 0 }}
							end={{ x: 0, y: 1 }}
							style={StyleSheet.absoluteFill}
							pointerEvents="none"
						/>
						<View
							className="absolute right-2.5 top-2.5 flex-row"
							accessible={false}
						>
							{SWATCH_KEYS.map((key, i) => (
								<View
									key={key}
									className="h-5 w-5 rounded-full border"
									style={{
										backgroundColor: tripletToHex(tokens[key]),
										borderColor: "rgba(255, 255, 255, 0.6)",
										marginLeft: i ? -6 : 0,
									}}
								/>
							))}
						</View>
						{selected ? (
							<View
								className="absolute left-2.5 top-2.5 h-6 w-6 items-center justify-center rounded-full"
								style={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}
							>
								<Icon as={Check} size={14} className="text-white" />
							</View>
						) : null}
						<Text
							className="p-3 text-base font-bold text-white"
							numberOfLines={1}
						>
							{name}
						</Text>
					</GradientSwatch>
				</SelectionRing>
			</PressableScale>
		</AnimatedEntrance>
	);
}

function CustomThemeRow({
	theme,
	index,
}: {
	theme: CustomTheme;
	index: number;
}) {
	const { t } = useI18n();
	const { scheme, activeTheme, setActiveTheme, refreshCustomThemes } =
		useTheme();
	const { data: session } = useSession();
	const id = `custom:${theme.id}`;
	const selected = activeTheme === id;
	const primary = theme[scheme]?.primary ?? "#000000";
	const accent = theme[scheme]?.accent ?? primary;

	const guard = (action: () => void) => {
		if (!session?.user) {
			router.push("/(auth)/login");
			return;
		}
		action();
	};

	const confirmDelete = () =>
		guard(() => {
			Alert.alert(
				t("appearance.deleteTitle"),
				t("appearance.deleteConfirm", { name: theme.name }),
				[
					{ text: t("common.cancel"), style: "cancel" },
					{
						text: t("common.delete"),
						style: "destructive",
						onPress: async () => {
							try {
								await client.theme.delete({ id: theme.id });
								// Server falls back to headpat when the active theme dies.
								if (selected) setActiveTheme("headpat");
								await refreshCustomThemes();
							} catch (e) {
								Alert.alert(t("appearance.deleteError"), humanizeError(e));
							}
						},
					},
				],
			);
		});

	return (
		<AnimatedEntrance index={index}>
			<SelectionRing selected={selected}>
				<View className="overflow-hidden rounded-2xl">
					<GradientSwatch
						primary={primary}
						accent={accent}
						scheme={scheme}
						style={StyleSheet.absoluteFill}
						pointerEvents="none"
					/>
					<View
						pointerEvents="none"
						style={[
							StyleSheet.absoluteFill,
							{ backgroundColor: "rgba(0, 0, 0, 0.35)" },
						]}
					/>
					<View
						className="flex-row items-center gap-1 py-2 pl-3 pr-1"
						style={{ minHeight: 60 }}
					>
						<PressableScale
							onPress={() => setActiveTheme(id)}
							accessibilityRole="button"
							accessibilityState={{ selected }}
							accessibilityLabel={t("appearance.themeA11y", {
								name: theme.name,
							})}
							className="flex-1"
							style={{
								width: "100%",
								minHeight: 44,
								flexDirection: "row",
								alignItems: "center",
								gap: 8,
							}}
						>
							<Text
								className="flex-1 font-semibold text-white"
								numberOfLines={1}
							>
								{theme.name}
							</Text>
							{selected ? (
								<Icon as={Check} size={18} className="text-white" />
							) : null}
						</PressableScale>
						<PressableScale
							haptic="selection"
							hitSlop={8}
							onPress={() =>
								guard(() => router.push(`/theme-builder?id=${theme.id}`))
							}
							accessibilityRole="button"
							accessibilityLabel={t("appearance.editTheme", {
								name: theme.name,
							})}
							className="p-2.5"
						>
							<Icon as={Pencil} size={18} className="text-white" />
						</PressableScale>
						<PressableScale
							hitSlop={8}
							onPress={confirmDelete}
							accessibilityRole="button"
							accessibilityLabel={t("appearance.deleteTheme", {
								name: theme.name,
							})}
							className="p-2.5"
						>
							<Icon as={Trash2} size={18} className="text-white" />
						</PressableScale>
					</View>
				</View>
			</SelectionRing>
		</AnimatedEntrance>
	);
}

const MODES: ThemeMode[] = ["system", "light", "dark"];
const PILL_SETTLE_MS = 250;

export default function Appearance() {
	const insets = useSafeAreaInsets();
	const { t } = useI18n();
	const { mode, customThemes, refreshCustomThemes } = useTheme();
	const { data: session } = useSession();
	const userId = session?.user?.id;

	const [reconciling, setReconciling] = useState(false);
	const changeThemeMode = useThemeModeChange();
	// The pill moves the moment you tap; the theme follows with the reveal.
	const [selectedMode, setSelectedMode] = useState<ThemeMode>(mode);
	useEffect(() => setSelectedMode(mode), [mode]);
	const tabsRef = useRef<ComponentRef<typeof View>>(null);

	// Reconcile the cached custom themes once per signed-in user.
	useEffect(() => {
		if (!userId) return;
		let alive = true;
		setReconciling(true);
		refreshCustomThemes().finally(() => {
			if (alive) setReconciling(false);
		});
		return () => {
			alive = false;
		};
	}, [userId, refreshCustomThemes]);

	const changeMode = (next: ThemeMode) => {
		setSelectedMode(next);
		const index = MODES.indexOf(next);
		// Let the pill slide over first, so the screenshot the reveal starts
		// from already shows it in place (springs.gentle settles in ~250ms).
		setTimeout(() => {
			tabsRef.current?.measureInWindow((x, y, w, h) =>
				changeThemeMode(next, {
					x: x + ((index + 0.5) * w) / MODES.length,
					y: y + h / 2,
				}),
			);
		}, PILL_SETTLE_MS);
	};

	const createTheme = () => {
		if (!userId) {
			router.push("/(auth)/login");
			return;
		}
		router.push("/theme-builder");
	};

	const modeTabs = [
		{ key: "system", label: t("appearance.modeSystem") },
		{ key: "light", label: t("appearance.modeLight") },
		{ key: "dark", label: t("appearance.modeDark") },
	];

	return (
		<View className="bg-background flex-1">
			<ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
				<AnimatedEntrance index={0} className="px-4">
					<PageTitle
						title={t("titles.appearance")}
						subtitle={t("appearance.heroSubtitle")}
					/>
				</AnimatedEntrance>

				<View className="gap-6 px-4 pb-4 pt-2">
					<AnimatedEntrance index={1} className="gap-3">
						<Text variant="caption" accessibilityRole="header">
							{t("appearance.mode")}
						</Text>
						<View ref={tabsRef} collapsable={false}>
							<SegmentedTabs
								tabs={modeTabs}
								value={selectedMode}
								onChange={(key) => changeMode(key as ThemeMode)}
							/>
						</View>
					</AnimatedEntrance>

					<View className="gap-3">
						<AnimatedEntrance index={2}>
							<Text variant="caption" accessibilityRole="header">
								{t("appearance.presets")}
							</Text>
						</AnimatedEntrance>
						<View className="flex-row flex-wrap gap-3">
							{PRESET_LIST.map((p, i) => (
								<PresetCard
									key={p.slug}
									slug={p.slug}
									name={p.name}
									index={2 + i}
								/>
							))}
						</View>
					</View>

					<View className="gap-3">
						<AnimatedEntrance index={7}>
							<Text variant="caption" accessibilityRole="header">
								{t("appearance.yourThemes")}
							</Text>
						</AnimatedEntrance>
						{reconciling && customThemes.length === 0 ? (
							<View className="gap-2">
								<Skeleton className="h-16 rounded-2xl" />
								<Skeleton className="h-16 rounded-2xl" />
							</View>
						) : customThemes.length === 0 ? (
							<AnimatedEntrance index={7}>
								<PressableScale
									haptic="selection"
									onPress={createTheme}
									accessibilityRole="button"
									accessibilityLabel={t("appearance.createTheme")}
								>
									<View className="border-border items-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed p-6">
										<Gradient
											opacity={0.08}
											style={StyleSheet.absoluteFill}
											pointerEvents="none"
										/>
										<View className="bg-primary/15 h-10 w-10 items-center justify-center rounded-full">
											<Icon as={Plus} size={20} className="text-primary" />
										</View>
										<Text className="font-semibold">
											{t("appearance.emptyTitle")}
										</Text>
										<Text variant="muted" className="text-center">
											{t("appearance.emptySubtitle")}
										</Text>
									</View>
								</PressableScale>
							</AnimatedEntrance>
						) : (
							<View className="gap-2">
								{customThemes.map((c, i) => (
									<CustomThemeRow
										key={c.id}
										theme={c}
										index={7 + Math.min(i, 1)}
									/>
								))}
								<Button
									variant="outline"
									onPress={createTheme}
									accessibilityLabel={t("appearance.createTheme")}
								>
									<Icon as={Plus} size={18} className="text-foreground" />
									<Text>{t("appearance.createTheme")}</Text>
								</Button>
							</View>
						)}
					</View>
				</View>
			</ScrollView>
		</View>
	);
}
