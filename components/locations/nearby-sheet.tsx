import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { forwardRef, useState } from "react";
import { Alert, View } from "react-native";
import { Check } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { useI18n } from "@/lib/i18n/provider";
import {
	nearbyFix,
	nearbyQueries,
	useInvalidateNearby,
} from "@/lib/location/nearby";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { client } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

const HOUR = 60 * 60 * 1000;
const DURATIONS = {
	"1h": HOUR,
	"4h": 4 * HOUR,
	"24h": 24 * HOUR,
	forever: null,
} as const;
type Duration = keyof typeof DURATIONS;

function Choice({
	label,
	selected,
	onPress,
}: {
	label: string;
	selected: boolean;
	onPress: () => void;
}) {
	return (
		<PressableScale
			onPress={onPress}
			haptic="selection"
			accessibilityRole="radio"
			accessibilityState={{ selected }}
			accessibilityLabel={label}
		>
			<View
				className={
					selected
						? "border-primary bg-accent/40 flex-row items-center gap-3 rounded-xl border px-3 py-3"
						: "border-border flex-row items-center gap-3 rounded-xl border px-3 py-3"
				}
			>
				<Text className="text-foreground flex-1">{label}</Text>
				{selected ? (
					<Icon as={Check} size={18} className="text-primary" />
				) : null}
			</View>
		</PressableScale>
	);
}

function ToggleLine({
	label,
	value,
	onChange,
}: {
	label: string;
	value: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<View className="flex-row items-center gap-3">
			<Text className="text-foreground flex-1">{label}</Text>
			<Toggle
				value={value}
				onValueChange={onChange}
				accessibilityLabel={label}
			/>
		</View>
	);
}

type Precision = "precise" | "rough";

// The map passes the layer switch; the nearby grid doesn't need it.
type Props = {
	showLayer?: boolean;
	onShowLayerChange?: (v: boolean) => void;
	onOpenGrid?: () => void;
};

// Opt-in "who's around": off until you switch it on here, and others only ever
// get a 1 km (event) or 5 km (anyone nearby) area, never your exact spot.
export const NearbySheet = forwardRef<BottomSheetModal, Props>(
	({ showLayer, onShowLayerChange, onOpenGrid }, ref) => {
		const { t, locale } = useI18n();
		const status = useQuery(nearbyQueries.status());
		const events = useQuery(nearbyQueries.events());
		const invalidate = useInvalidateNearby();
		const [scope, setScope] = useState("open");
		const [duration, setDuration] = useState<Duration>("4h");
		const [reciprocal, setReciprocal] = useState(false);
		const [precision, setPrecision] = useState<Precision>("rough");
		const [busy, setBusy] = useState(false);

		const run = async (action: () => Promise<unknown>) => {
			setBusy(true);
			try {
				await action();
				await invalidate();
			} catch (e) {
				Alert.alert(t("locations.errorTitle"), humanizeError(e));
			} finally {
				setBusy(false);
			}
		};

		const goVisible = () =>
			run(async () => {
				const pos = await nearbyFix(true);
				if (!pos) {
					Alert.alert(t("locations.errorTitle"), t("nearby.noLocation"));
					return;
				}
				const ms = DURATIONS[duration];
				await client.nearby.enable({
					...pos,
					scope: scope === "open" ? "open" : "event",
					eventId: scope === "open" ? undefined : scope,
					expiresAt:
						ms === null ? null : new Date(Date.now() + ms).toISOString(),
					reciprocalOnly: reciprocal,
					precision,
				});
			});

		// A new precision needs a fresh fix to snap to the new cell size, so it
		// re-enables with everything else kept as it is.
		const changePrecision = (next: Precision) =>
			run(async () => {
				const cur = status.data;
				if (!cur?.visible || cur.precision === next) return;
				const pos = await nearbyFix(true);
				if (!pos) {
					Alert.alert(t("locations.errorTitle"), t("nearby.noLocation"));
					return;
				}
				await client.nearby.enable({
					...pos,
					scope: cur.scope,
					eventId: cur.eventId ?? undefined,
					expiresAt: cur.expiresAt
						? new Date(cur.expiresAt).toISOString()
						: null,
					reciprocalOnly: cur.reciprocalOnly,
					precision: next,
				});
			});

		// Chips rather than rows so the sheet still fits without scrolling.
		const precisionChoices = (
			value: Precision,
			onPick: (p: Precision) => void,
		) => (
			<View className="gap-2">
				<Text className="text-foreground font-semibold">
					{t("nearby.howExact")}
				</Text>
				<View className="flex-row flex-wrap gap-2">
					{(["rough", "precise"] as const).map((p) => (
						<Button
							key={p}
							size="sm"
							variant={value === p ? "default" : "secondary"}
							disabled={busy}
							onPress={() => onPick(p)}
							accessibilityRole="radio"
							accessibilityState={{ selected: value === p }}
						>
							<Text>
								{t(
									p === "precise"
										? "nearby.precisePrecise"
										: "nearby.preciseRough",
								)}
							</Text>
						</Button>
					))}
				</View>
			</View>
		);

		const fmt = (d: Date | string) =>
			new Date(d).toLocaleString(locale, {
				weekday: "short",
				hour: "2-digit",
				minute: "2-digit",
			});

		const durationLabel = (d: Duration) =>
			d === "forever"
				? t(
						scope === "open"
							? "nearby.duration.forever"
							: "nearby.duration.eventEnd",
					)
				: t(`nearby.duration.${d}`);

		const s = status.data;
		const endsAt = s?.visible
			? [s.expiresAt, s.eventEndsAt]
					.filter((d): d is Date => !!d)
					.map((d) => new Date(d))
					.sort((a, b) => a.getTime() - b.getTime())[0]
			: undefined;

		return (
			<Sheet ref={ref} title={t("nearby.title")} accent>
				<View className="gap-4 pb-2">
					<Text variant="muted">{t("nearby.intro")}</Text>
					{onShowLayerChange ? (
						<ToggleLine
							label={t("nearby.showLayer")}
							value={showLayer ?? true}
							onChange={onShowLayerChange}
						/>
					) : null}
					{onOpenGrid ? (
						<Button fullWidth variant="secondary" onPress={onOpenGrid}>
							<Text>{t("nearby.openGrid")}</Text>
						</Button>
					) : null}
					<View className="border-border border-t" />

					{s?.visible ? (
						<View className="gap-3">
							<Text className="text-foreground">
								{s.scope === "event"
									? t("nearby.visibleEvent", { event: s.eventTitle ?? "" })
									: t("nearby.visibleOpen")}
							</Text>
							<Text variant="muted">
								{endsAt
									? t("nearby.until", { time: fmt(endsAt) })
									: t("nearby.untilOff")}
							</Text>
							{precisionChoices(s.precision, changePrecision)}
							<ToggleLine
								label={t("nearby.reciprocal")}
								value={s.reciprocalOnly}
								onChange={(v) =>
									run(() => client.nearby.updateSettings({ reciprocalOnly: v }))
								}
							/>
							<Button
								fullWidth
								variant="secondary"
								loading={busy}
								disabled={busy}
								onPress={() => run(() => client.nearby.disable({}))}
							>
								<Text>{t("nearby.stop")}</Text>
							</Button>
						</View>
					) : (
						<View className="gap-3">
							<Text className="text-foreground font-semibold">
								{t("nearby.whoSees")}
							</Text>
							<View className="gap-2">
								<Choice
									label={t("nearby.scopeOpen")}
									selected={scope === "open"}
									onPress={() => setScope("open")}
								/>
								{(events.data ?? []).map((e) => (
									<Choice
										key={e.id}
										label={t("nearby.scopeEvent", { event: e.title })}
										selected={scope === e.id}
										onPress={() => {
											setScope(e.id);
											// 24h only exists for open scope
											if (duration === "24h") setDuration("4h");
										}}
									/>
								))}
							</View>
							<Text variant="muted">
								{scope === "open"
									? t("nearby.audienceOpen")
									: t("nearby.audienceEvent")}
							</Text>
							{precisionChoices(precision, setPrecision)}
							<Text variant="muted">
								{precision === "precise"
									? t("nearby.fuzzPrecise")
									: scope === "open"
										? t("nearby.fuzzOpen")
										: t("nearby.fuzzEvent")}
							</Text>

							<Text className="text-foreground font-semibold">
								{t("nearby.howLong")}
							</Text>
							<View className="flex-row flex-wrap gap-2">
								{(Object.keys(DURATIONS) as Duration[])
									.filter((d) => scope === "open" || d !== "24h")
									.map((d) => (
										<Button
											key={d}
											size="sm"
											variant={duration === d ? "default" : "secondary"}
											onPress={() => setDuration(d)}
											accessibilityRole="radio"
											accessibilityState={{ selected: duration === d }}
										>
											<Text>{durationLabel(d)}</Text>
										</Button>
									))}
							</View>

							<ToggleLine
								label={t("nearby.reciprocal")}
								value={reciprocal}
								onChange={setReciprocal}
							/>
							<Button
								fullWidth
								loading={busy}
								disabled={busy}
								onPress={goVisible}
							>
								<Text>{t("nearby.start")}</Text>
							</Button>
							<Text variant="muted">{t("nearby.privacy")}</Text>
						</View>
					)}
				</View>
			</Sheet>
		);
	},
);
NearbySheet.displayName = "NearbySheet";
