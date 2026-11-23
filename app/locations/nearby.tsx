import type { AdultLookingFor, LookingFor } from "@backend/lib/discovery";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Pressable,
	RefreshControl,
	useWindowDimensions,
	View,
} from "react-native";
import { Chip } from "@/components/discovery/toggle-chips";
import { Users } from "@/components/icons";
import { NearbySheet } from "@/components/locations/nearby-sheet";
import { StorageImage } from "@/components/storage-image";
import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/ui/gradient-text";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import {
	NEARBY_REFRESH_MS,
	type NearbyPerson,
	nearbyFix,
	nearbyQueries,
	useRefreshOwnCell,
} from "@/lib/location/nearby";
import { orpc } from "@/lib/orpc";
import { useTheme } from "@/lib/theme/provider";
import { useDebouncedValue } from "@/lib/use-debounced-value";

type Sort = "nearest" | "recent";
type Near = { lat: number; lng: number };

const COLUMNS = 3;
const GAP = 8;
const PAD = 16;
const DOT: Record<string, string> = {
	online: "#10b981",
	away: "#f59e0b",
	dnd: "#ef4444",
};

// Rounded so small GPS wobble doesn't refetch; ~100 m is finer than any cell.
function roundNear(p: Near): Near {
	return {
		lat: Math.round(p.lat * 1000) / 1000,
		lng: Math.round(p.lng * 1000) / 1000,
	};
}

function Tile({
	p,
	size,
	status,
	distance,
	adult,
}: {
	p: NearbyPerson;
	size: number;
	status: string;
	distance: string | null;
	// 18+ grid: picture stays blurred, and tapping opens the 18+ profile
	adult: boolean;
}) {
	const name = p.displayName || p.name || p.profileUrl || "?";
	return (
		<Pressable
			onPress={() => {
				if (adult) router.push(`/discovery/adult-profile/${p.userId}` as never);
				else if (p.profileUrl) router.push(`/user/${p.profileUrl}` as never);
			}}
			accessibilityRole="button"
			accessibilityLabel={distance ? `${name}, ${distance}` : name}
			className="bg-muted border-border overflow-hidden rounded-2xl border active:opacity-80"
			style={{ width: size, height: size }}
		>
			{p.avatarFileId ? (
				<StorageImage
					kind="avatar"
					fileId={p.avatarFileId}
					variant="md"
					transition={0}
					blurRadius={adult ? 30 : undefined}
					style={{ width: size, height: size }}
				/>
			) : (
				<View className="flex-1 items-center justify-center">
					<Text className="font-display text-muted-foreground text-3xl">
						{name.charAt(0).toUpperCase()}
					</Text>
				</View>
			)}
			<View className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1">
				<View className="flex-row items-center gap-1">
					{DOT[status] ? (
						<View
							style={{
								width: 7,
								height: 7,
								borderRadius: 4,
								backgroundColor: DOT[status],
							}}
						/>
					) : null}
					<Text
						className="flex-1 text-xs font-semibold text-white"
						numberOfLines={1}
					>
						{name}
					</Text>
				</View>
				{distance ? (
					<Text className="text-[10px] text-white/80" numberOfLines={1}>
						{distance}
					</Text>
				) : null}
			</View>
		</Pressable>
	);
}

// A Barq-style grid of everyone who chose to be visible, nearest first.
// Distances come from the API, rounded to each person's cell.
export default function NearbyGrid() {
	const { t } = useI18n();
	const { colors } = useTheme();
	const { width } = useWindowDimensions();
	const sheetRef = useRef<BottomSheetModal>(null);
	const tile = Math.floor((width - PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

	const [near, setNear] = useState<Near | null>(null);
	const [noLocation, setNoLocation] = useState(false);
	const locate = useCallback(async (ask: boolean) => {
		const pos = await nearbyFix(ask);
		if (pos) setNear(roundNear(pos));
		setNoLocation(!pos);
	}, []);
	useEffect(() => {
		locate(false);
	}, [locate]);

	const [sort, setSort] = useState<Sort>("nearest");
	const [onlineOnly, setOnlineOnly] = useState(false);
	const [eventId, setEventId] = useState<string | null>(null);
	const [mode, setMode] = useState<"all" | "adult">("all");
	const [lookingFor, setLookingFor] = useState<
		LookingFor | AdultLookingFor | null
	>(null);
	const [interestDraft, setInterestDraft] = useState("");
	const interest = useDebouncedValue(interestDraft.trim().toLowerCase(), 300);
	const mine = useQuery(orpc.discovery.mine.queryOptions({ input: {} }));
	const options = useQuery(orpc.discovery.options.queryOptions());
	const canAdult = mine.data?.canAdult === true;
	const lookingForOptions: readonly (LookingFor | AdultLookingFor)[] =
		mode === "adult"
			? (options.data?.adultLookingFor ?? [])
			: (options.data?.lookingFor ?? []);

	const status = useQuery(nearbyQueries.status());
	useRefreshOwnCell(status.data?.visible === true);
	const list = useQuery({
		...orpc.nearby.list.queryOptions({
			input: {
				near: near ?? undefined,
				sort,
				mode,
				interest: interest || undefined,
				lookingFor: lookingFor ?? undefined,
			},
		}),
		refetchInterval: NEARBY_REFRESH_MS,
	});
	const people = list.data ?? [];

	const ids = useMemo(
		() => people.slice(0, 200).map((p) => p.userId),
		[people],
	);
	const presence = useQuery({
		...orpc.presence.getMany.queryOptions({ input: { userIds: ids } }),
		enabled: ids.length > 0,
		staleTime: 30_000,
	});
	const statusOf = (id: string) => presence.data?.[id]?.status ?? "offline";

	const events = useMemo(() => {
		const m = new Map<string, string>();
		for (const p of people)
			if (p.eventId && p.eventTitle) m.set(p.eventId, p.eventTitle);
		return [...m.entries()];
	}, [people]);

	const shown = people.filter(
		(p) =>
			(!onlineOnly || statusOf(p.userId) !== "offline") &&
			(!eventId || p.eventId === eventId),
	);

	const distanceLabel = (p: NearbyPerson) =>
		p.distanceKm === null
			? (p.eventTitle ?? null)
			: t(
					p.precision === "precise"
						? "nearbyGrid.distance"
						: "nearbyGrid.distanceRough",
					{
						km: p.distanceKm.toLocaleString(undefined, {
							maximumFractionDigits: 1,
						}),
					},
				);

	const [refreshing, setRefreshing] = useState(false);

	const header = (
		<View className="gap-3 pb-3">
			<View className="flex-row items-start gap-3">
				<View className="flex-1 gap-1">
					<GradientText className="text-3xl font-extrabold leading-9 tracking-tight">
						{t("nearbyGrid.title")}
					</GradientText>
					<Text variant="muted">{t("nearbyGrid.subtitle")}</Text>
				</View>
				<Button
					size="sm"
					variant={status.data?.visible ? "default" : "secondary"}
					onPress={() => sheetRef.current?.present()}
				>
					<Icon as={Users} size={16} />
					<Text>
						{status.data?.visible
							? t("nearby.buttonVisible")
							: t("nearby.button")}
					</Text>
				</Button>
			</View>
			{canAdult ? (
				<View className="flex-row gap-2">
					<Chip
						label={t("nearbyGrid.modeAll")}
						active={mode === "all"}
						onPress={() => {
							setMode("all");
							setLookingFor(null);
						}}
					/>
					<Chip
						label={t("nearbyGrid.modeAdult")}
						active={mode === "adult"}
						onPress={() => {
							setMode("adult");
							setLookingFor(null);
						}}
					/>
				</View>
			) : null}
			<View className="flex-row flex-wrap gap-2">
				<Chip
					label={t("nearbyGrid.sortNearest")}
					active={sort === "nearest"}
					onPress={() => setSort("nearest")}
				/>
				<Chip
					label={t("nearbyGrid.sortRecent")}
					active={sort === "recent"}
					onPress={() => setSort("recent")}
				/>
				<Chip
					label={t("nearbyGrid.filterOnline")}
					active={onlineOnly}
					onPress={() => setOnlineOnly((v) => !v)}
				/>
				{events.map(([id, title]) => (
					<Chip
						key={id}
						label={t("nearbyGrid.filterEvent", { event: title })}
						active={eventId === id}
						onPress={() => setEventId((cur) => (cur === id ? null : id))}
					/>
				))}
			</View>
			<View className="flex-row flex-wrap items-center gap-2">
				{lookingForOptions.map((k) => (
					<Chip
						key={k}
						label={t(
							`discovery.${mode === "adult" ? "adultLookingFor" : "lookingFor"}.${k}`,
						)}
						active={lookingFor === k}
						onPress={() => setLookingFor((cur) => (cur === k ? null : k))}
					/>
				))}
			</View>
			<Input
				value={interestDraft}
				onChangeText={setInterestDraft}
				placeholder={
					mode === "adult"
						? t("nearbyGrid.filterInto")
						: t("nearbyGrid.filterInterest")
				}
				autoCapitalize="none"
				maxLength={32}
			/>
			{noLocation && sort === "nearest" ? (
				<View className="border-border bg-card flex-row items-center gap-3 rounded-xl border px-3 py-2">
					<Text variant="muted" className="flex-1 text-sm">
						{t("nearbyGrid.noLocation")}
					</Text>
					<Button size="sm" variant="secondary" onPress={() => locate(true)}>
						<Text>{t("nearbyGrid.tryLocation")}</Text>
					</Button>
				</View>
			) : null}
		</View>
	);

	return (
		<View className="bg-background flex-1">
			<FlashList
				data={shown}
				numColumns={COLUMNS}
				keyExtractor={(p) => p.userId}
				contentContainerStyle={{ padding: PAD }}
				ListHeaderComponent={header}
				ListEmptyComponent={
					list.isPending ? null : (
						<View className="border-border items-center gap-1 rounded-2xl border border-dashed px-6 py-10">
							<Text className="font-semibold">{t("nearbyGrid.empty")}</Text>
							<Text variant="muted" className="text-center">
								{t("nearbyGrid.emptyHint")}
							</Text>
						</View>
					)
				}
				renderItem={({ item }) => (
					<View style={{ flex: 1, alignItems: "center", paddingBottom: GAP }}>
						<Tile
							p={item}
							size={tile}
							status={statusOf(item.userId)}
							distance={distanceLabel(item)}
							adult={mode === "adult"}
						/>
					</View>
				)}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={async () => {
							setRefreshing(true);
							try {
								await Promise.all([list.refetch(), locate(false)]);
							} finally {
								setRefreshing(false);
							}
						}}
						tintColor={colors.primary}
						colors={[colors.primary]}
					/>
				}
			/>
			<NearbySheet ref={sheetRef} />
		</View>
	);
}
