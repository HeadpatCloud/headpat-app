import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
	Camera,
	GeoJSONSource,
	Layer,
	Map as MapView,
	Marker,
	type StyleSpecification,
	UserLocation,
} from "@maplibre/maplibre-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { StatusSheet } from "@/components/locations/status-sheet";
import { StorageImage } from "@/components/storage-image";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { locationQueries } from "@/lib/location/api";
import {
	type LiveLocation,
	useLiveLocations,
} from "@/lib/location/live-locations";
import { useLocationSharing } from "@/lib/location/use-location-sharing";
import { connectLocationSocket } from "@/lib/location/ws";
import { orpc } from "@/lib/orpc";
import { presenceColor } from "@/lib/presence/status-color";
import { useTheme } from "@/lib/theme/provider";

type LngLat = [number, number];
type PresenceInfo = { status?: string; customStatus?: string | null };

const MARKER = 44;
const MARKER_INNER = MARKER - 6;
const EVENT_COLOR = "#7c3aed";
const DEFAULT_CENTER: LngLat = [0, 20];

// CARTO's OpenStreetMap raster basemap — the same tiles the web uses, no API key.
function cartoStyle(dark: boolean): StyleSpecification {
	const variant = dark ? "dark_all" : "light_all";
	return {
		version: 8,
		sources: {
			carto: {
				type: "raster",
				tiles: [
					`https://a.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}@2x.png`,
					`https://b.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}@2x.png`,
					`https://c.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}@2x.png`,
					`https://d.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}@2x.png`,
				],
				tileSize: 512,
				attribution:
					'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
			},
		},
		layers: [{ id: "carto", type: "raster", source: "carto" }],
	};
}

type MapEvent = {
	id: string;
	title: string;
	locationZoneMethod: string;
	coordinates: string[];
	circleRadius: number | null;
};

function parsePoint(coord: string): LngLat | null {
	const [lat, lng] = coord.split(",").map(Number);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	return [lng, lat];
}

function eventPoints(coords: string[]): LngLat[] {
	return coords.map(parsePoint).filter((p): p is LngLat => p !== null);
}

function eventCenter(e: MapEvent): LngLat | null {
	const pts = eventPoints(e.coordinates);
	if (pts.length === 0) return null;
	if (e.locationZoneMethod === "circle") return pts[0];
	const sum = pts.reduce<LngLat>((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
	return [sum[0] / pts.length, sum[1] / pts.length];
}

// Approximate a geographic circle (center + radius in metres) as a polygon ring,
// so MapLibre can draw circle zones with the same fill/line layers as polygons.
function circleRing(
	center: LngLat,
	radiusMeters: number,
	steps = 64,
): LngLat[] {
	const [lng, lat] = center;
	const dLat = radiusMeters / 111_320;
	const dLng = radiusMeters / (111_320 * Math.cos((lat * Math.PI) / 180));
	const ring: LngLat[] = [];
	for (let i = 0; i <= steps; i++) {
		const theta = (i / steps) * 2 * Math.PI;
		ring.push([lng + dLng * Math.cos(theta), lat + dLat * Math.sin(theta)]);
	}
	return ring;
}

// One FeatureCollection of all event zones (polygons drawn directly, circles
// approximated). Fed to a single GeoJSONSource + fill/line layers.
function zoneFeatures(events: MapEvent[]): GeoJSON.FeatureCollection {
	const features: GeoJSON.Feature[] = [];
	for (const e of events) {
		const pts = eventPoints(e.coordinates);
		let ring: LngLat[] | null = null;
		if (e.locationZoneMethod === "polygon" && pts.length >= 3) {
			ring = [...pts, pts[0]];
		} else if (e.locationZoneMethod === "circle" && e.circleRadius && pts[0]) {
			ring = circleRing(pts[0], e.circleRadius);
		}
		if (!ring) continue;
		features.push({
			type: "Feature",
			geometry: { type: "Polygon", coordinates: [ring] },
			properties: { id: e.id },
		});
	}
	return { type: "FeatureCollection", features };
}

// A sharer's marker: their avatar (or first initial) in a circle, ringed in their
// presence color, with their name/status on a pill. Tap opens their profile.
function PersonMarker({
	l,
	presence,
}: {
	l: LiveLocation;
	presence?: PresenceInfo;
}) {
	const profile = useQuery(
		orpc.profile.byId.queryOptions({ input: { userId: l.userId } }),
	);
	const name =
		profile.data?.displayName ?? profile.data?.profileUrl ?? l.userId;
	const profileUrl = profile.data?.profileUrl ?? null;
	const fileId = profile.data?.avatarFileId ?? null;
	const letter = name.trim().charAt(0).toUpperCase() || "?";
	const ring = presenceColor(presence?.status);
	const label = presence?.customStatus || name;

	return (
		<Marker
			id={l.userId}
			lngLat={[l.lng, l.lat]}
			anchor="bottom"
			onPress={() => {
				if (profileUrl) router.push(`/user/${profileUrl}` as never);
			}}
		>
			<View className="items-center gap-1">
				<View
					style={{
						width: MARKER,
						height: MARKER,
						borderRadius: MARKER / 2,
						borderWidth: 3,
						borderColor: ring,
						backgroundColor: "#fff",
						alignItems: "center",
						justifyContent: "center",
						overflow: "hidden",
					}}
				>
					{fileId ? (
						<StorageImage
							kind="avatar"
							fileId={fileId}
							variant="sm"
							transition={0}
							style={{
								width: MARKER_INNER,
								height: MARKER_INNER,
								borderRadius: MARKER_INNER / 2,
							}}
						/>
					) : (
						<View
							style={{
								width: MARKER_INNER,
								height: MARKER_INNER,
								borderRadius: MARKER_INNER / 2,
								backgroundColor: "#52525b",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Text
								style={{
									color: "#fff",
									fontWeight: "700",
									fontSize: MARKER_INNER * 0.45,
								}}
							>
								{letter}
							</Text>
						</View>
					)}
				</View>
				<View className="max-w-[140px] rounded-full bg-black/70 px-2 py-0.5">
					<Text
						className="text-[10px] font-semibold text-white"
						numberOfLines={1}
					>
						{label}
					</Text>
				</View>
			</View>
		</Marker>
	);
}

export default function LocationsScreen() {
	const { t } = useI18n();
	const { scheme } = useTheme();
	const qc = useQueryClient();
	const statusRef = useRef<BottomSheetModal>(null);
	useLocationSharing(); // starts/stops background updates based on active shares
	const visible = useQuery({
		...locationQueries.visible(),
		// Location is real-time-critical: never serve a stale (persisted) seed, so
		// reopening the map reflects revokes/precision changes immediately.
		staleTime: 0,
		refetchOnMount: "always",
	});
	const events = useQuery(orpc.event.mapList.queryOptions());
	const seed = useMemo<LiveLocation[]>(() => {
		return (visible.data ?? []).map((item) => ({
			userId: item.userId,
			lat: item.lat,
			lng: item.lng,
			accuracy: item.accuracy ?? null,
			heading: item.heading ?? null,
			speed: item.speed ?? null,
			statusText: item.statusText ?? null,
			statusColor: item.statusColor ?? null,
			updatedAt:
				item.updatedAt instanceof Date
					? item.updatedAt.toISOString()
					: (item.updatedAt ?? undefined),
		}));
	}, [visible.data]);
	const { locations, dispatch } = useLiveLocations(seed);

	// Presence (status + ring color) for everyone on the map. Key by the sorted id
	// set so live position updates don't churn the query.
	const idsKey = locations
		.map((l) => l.userId)
		.sort()
		.join(",");
	const presenceUserIds = useMemo(
		() => (idsKey ? idsKey.split(",") : []),
		[idsKey],
	);
	const presenceQuery = useQuery({
		...orpc.presence.getMany.queryOptions({
			input: { userIds: presenceUserIds },
		}),
		enabled: presenceUserIds.length > 0,
		staleTime: 30_000,
	});
	const presence: Record<string, PresenceInfo> = presenceQuery.data ?? {};

	useEffect(
		() =>
			connectLocationSocket(dispatch, () => {
				qc.refetchQueries({ queryKey: locationQueries.visible().queryKey });
			}),
		[dispatch, qc],
	);

	const eventPins = useMemo(
		() =>
			(events.data ?? [])
				.map((e) => ({ e: e as MapEvent, center: eventCenter(e as MapEvent) }))
				.filter((x): x is { e: MapEvent; center: LngLat } => x.center !== null),
		[events.data],
	);
	const zones = useMemo(
		() => zoneFeatures((events.data ?? []) as MapEvent[]),
		[events.data],
	);

	// When-in-use permission for the "you are here" dot + initial centering. The
	// background disclosure/permission lives on the share screen, not here.
	const [showUser, setShowUser] = useState(false);
	const [userCenter, setUserCenter] = useState<LngLat | null>(null);
	useEffect(() => {
		let cancelled = false;
		(async () => {
			const granted =
				(await Location.getForegroundPermissionsAsync().catch(() => null))
					?.granted ?? false;
			if (cancelled) return;
			setShowUser(granted);
			if (granted) {
				const pos = await Location.getLastKnownPositionAsync().catch(
					() => null,
				);
				if (pos && !cancelled) {
					setUserCenter([pos.coords.longitude, pos.coords.latitude]);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	// Center once on the first available anchor: the user, else a shared person/event.
	const dataCenter: LngLat | null = locations[0]
		? [locations[0].lng, locations[0].lat]
		: (eventPins[0]?.center ?? null);
	const [frozenCenter, setFrozenCenter] = useState<LngLat | null>(null);
	useEffect(() => {
		if (frozenCenter) return;
		const c = userCenter ?? dataCenter;
		if (c) setFrozenCenter(c);
	}, [userCenter, dataCenter, frozenCenter]);
	const center = frozenCenter ?? DEFAULT_CENTER;

	return (
		<View style={StyleSheet.absoluteFill}>
			<MapView
				style={StyleSheet.absoluteFill}
				mapStyle={cartoStyle(scheme === "dark")}
				logo={false}
				attributionPosition={{ bottom: 8, left: 8 }}
			>
				<Camera
					key={frozenCenter ? "anchored" : "default"}
					initialViewState={{ center, zoom: frozenCenter ? 12 : 1.5 }}
				/>
				{zones.features.length > 0 ? (
					<GeoJSONSource id="event-zones" data={zones}>
						<Layer
							id="event-zones-fill"
							type="fill"
							paint={{ "fill-color": EVENT_COLOR, "fill-opacity": 0.15 }}
						/>
						<Layer
							id="event-zones-line"
							type="line"
							paint={{ "line-color": EVENT_COLOR, "line-width": 2 }}
						/>
					</GeoJSONSource>
				) : null}
				{showUser ? <UserLocation /> : null}
				{locations.map((l) => (
					<PersonMarker key={l.userId} l={l} presence={presence[l.userId]} />
				))}
				{eventPins.map(({ e, center: c }) => (
					<Marker
						key={e.id}
						id={e.id}
						lngLat={c}
						anchor="bottom"
						onPress={() => router.push(`/events/${e.id}`)}
					>
						<View
							className="rounded-full px-2 py-1"
							style={{ backgroundColor: EVENT_COLOR }}
						>
							<Text
								className="text-[10px] font-semibold text-white"
								numberOfLines={1}
							>
								{e.title}
							</Text>
						</View>
					</Marker>
				))}
			</MapView>

			{locations.length === 0 ? (
				<View
					className="absolute inset-x-0 bottom-10 items-center"
					pointerEvents="none"
				>
					<Text variant="muted">{t("locations.empty")}</Text>
				</View>
			) : null}
			<View className="absolute left-4 top-4">
				<Button
					size="sm"
					variant="secondary"
					onPress={() => statusRef.current?.present()}
				>
					<Text>{t("presence.setStatus")}</Text>
				</Button>
			</View>
			<View className="absolute right-4 top-4">
				<Button
					size="sm"
					onPress={() => router.push("/locations/share" as never)}
				>
					<Text>{t("locations.manageTitle")}</Text>
				</Button>
			</View>

			<StatusSheet ref={statusRef} />
		</View>
	);
}
