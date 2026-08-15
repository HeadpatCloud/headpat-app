import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
	Camera,
	type CameraRef,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import Supercluster from "supercluster";
import { LocateFixed } from "@/components/icons";
import { StatusSheet } from "@/components/locations/status-sheet";
import { StorageImage } from "@/components/storage-image";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
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
type ClusterPoint = { kind: "person" | "event"; id: string };

const MARKER = 44;
const MARKER_INNER = MARKER - 6;
const EVENT_COLOR = "#7c3aed";
const DEFAULT_CENTER: LngLat = [0, 20];

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

function ClusterMarker({
	id,
	count,
	lngLat,
	color,
	onPress,
}: {
	id: string;
	count: number;
	lngLat: LngLat;
	color: string;
	onPress: () => void;
}) {
	const size = count < 10 ? 40 : count < 100 ? 48 : 56;
	return (
		<Marker id={id} lngLat={lngLat} anchor="center" onPress={onPress}>
			<View
				style={{
					width: size,
					height: size,
					borderRadius: size / 2,
					backgroundColor: color,
					borderWidth: 3,
					borderColor: "#fff",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Text
					style={{ color: "#fff", fontWeight: "800", fontSize: size * 0.34 }}
				>
					{count}
				</Text>
			</View>
		</Marker>
	);
}

function EventMarker({ e, lngLat }: { e: MapEvent; lngLat: LngLat }) {
	return (
		<Marker
			id={e.id}
			lngLat={lngLat}
			anchor="bottom"
			onPress={() => router.push(`/event/${e.id}`)}
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
	);
}

export default function LocationsScreen() {
	const { t } = useI18n();
	const { scheme, colors } = useTheme();
	const qc = useQueryClient();
	const statusRef = useRef<BottomSheetModal>(null);
	useLocationSharing();
	const visible = useQuery({
		...locationQueries.visible(),
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

	const cameraRef = useRef<CameraRef>(null);
	const [zoom, setZoom] = useState(12);
	const byId = useMemo(
		() => new Map(locations.map((l) => [l.userId, l])),
		[locations],
	);
	const eventById = useMemo(
		() => new Map(eventPins.map((p) => [p.e.id, p])),
		[eventPins],
	);
	const cluster = useMemo(() => {
		const sc = new Supercluster<ClusterPoint>({ radius: 80, maxZoom: 16 });
		sc.load([
			...locations.map(
				(l): Supercluster.PointFeature<ClusterPoint> => ({
					type: "Feature",
					properties: { kind: "person", id: l.userId },
					geometry: { type: "Point", coordinates: [l.lng, l.lat] },
				}),
			),
			...eventPins.map(
				({ e, center }): Supercluster.PointFeature<ClusterPoint> => ({
					type: "Feature",
					properties: { kind: "event", id: e.id },
					geometry: { type: "Point", coordinates: center },
				}),
			),
		]);
		return sc;
	}, [locations, eventPins]);
	const clusters = useMemo(
		() => cluster.getClusters([-180, -85, 180, 85], Math.round(zoom)),
		[cluster, zoom],
	);
	function expandCluster(clusterId: number, center: LngLat) {
		cameraRef.current?.flyTo({
			center,
			zoom: cluster.getClusterExpansionZoom(clusterId),
			duration: 400,
		});
	}

	const [showUser, setShowUser] = useState(false);
	const [userCenter, setUserCenter] = useState<LngLat | null>(null);
	// Tracks whether a fix is still pending, so the data-pin fallback below
	// doesn't anchor the camera on a stranger while we're still locating.
	const [locating, setLocating] = useState(true);
	useEffect(() => {
		let cancelled = false;
		(async () => {
			const granted =
				(await Location.getForegroundPermissionsAsync().catch(() => null))
					?.granted ?? false;
			if (cancelled) return;
			setShowUser(granted);
			if (!granted) {
				setLocating(false);
				return;
			}
			// Last known paints the camera immediately; the live fix follows and
			// corrects it. Without the second call, a device with no cached fix
			// never resolves a position at all.
			const last = await Location.getLastKnownPositionAsync().catch(() => null);
			if (last && !cancelled) {
				setUserCenter([last.coords.longitude, last.coords.latitude]);
			}
			const pos = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced,
			}).catch(() => null);
			if (cancelled) return;
			setLocating(false);
			if (!pos) return;
			const live: LngLat = [pos.coords.longitude, pos.coords.latitude];
			setUserCenter(live);
			// frozenCenter latches its first value, so a late fix has to move the
			// camera itself.
			cameraRef.current?.flyTo({ center: live, zoom: 14, duration: 500 });
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const recenter = useCallback(async () => {
		const perm = await Location.requestForegroundPermissionsAsync().catch(
			() => null,
		);
		if (!perm?.granted) {
			Alert.alert(t("locations.errorTitle"), t("locations.recenterDenied"));
			return;
		}
		setShowUser(true);
		const pos = await Location.getCurrentPositionAsync({
			accuracy: Location.Accuracy.Balanced,
		}).catch(() => null);
		if (!pos) {
			Alert.alert(t("locations.errorTitle"), t("locations.recenterFailed"));
			return;
		}
		const live: LngLat = [pos.coords.longitude, pos.coords.latitude];
		setUserCenter(live);
		cameraRef.current?.flyTo({ center: live, zoom: 14, duration: 500 });
	}, [t]);

	const dataCenter: LngLat | null = locations[0]
		? [locations[0].lng, locations[0].lat]
		: (eventPins[0]?.center ?? null);
	const [frozenCenter, setFrozenCenter] = useState<LngLat | null>(null);
	useEffect(() => {
		if (frozenCenter) return;
		// The device position always wins; a data pin is only an anchor once we
		// know no fix is coming (permission denied, or the lookup failed).
		if (userCenter) {
			setFrozenCenter(userCenter);
			return;
		}
		if (!locating && dataCenter) setFrozenCenter(dataCenter);
	}, [userCenter, dataCenter, frozenCenter, locating]);
	const center = frozenCenter ?? DEFAULT_CENTER;

	return (
		<View style={StyleSheet.absoluteFill}>
			<MapView
				style={StyleSheet.absoluteFill}
				mapStyle={cartoStyle(scheme === "dark")}
				logo={false}
				attributionPosition={{ bottom: 8, left: 8 }}
				onRegionDidChange={(e) => {
					const z = e.nativeEvent.zoom;
					if (Number.isFinite(z)) setZoom(z);
				}}
			>
				<Camera
					ref={cameraRef}
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
				{clusters.map((feature) => {
					const [lng, lat] = feature.geometry.coordinates;
					if ("cluster" in feature.properties) {
						const id = feature.properties.cluster_id;
						return (
							<ClusterMarker
								key={`cluster-${id}`}
								id={`cluster-${id}`}
								count={feature.properties.point_count}
								lngLat={[lng, lat]}
								color={colors.primary}
								onPress={() => expandCluster(id, [lng, lat])}
							/>
						);
					}
					if (feature.properties.kind === "person") {
						const l = byId.get(feature.properties.id);
						return l ? (
							<PersonMarker
								key={l.userId}
								l={l}
								presence={presence[l.userId]}
							/>
						) : null;
					}
					const ev = eventById.get(feature.properties.id);
					return ev ? (
						<EventMarker key={ev.e.id} e={ev.e} lngLat={ev.center} />
					) : null;
				})}
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
			<View className="absolute bottom-24 right-4">
				<Button
					size="sm"
					variant="secondary"
					onPress={recenter}
					accessibilityRole="button"
					accessibilityLabel={t("locations.recenter")}
				>
					<Icon as={LocateFixed} size={18} />
				</Button>
			</View>

			<StatusSheet ref={statusRef} />
		</View>
	);
}
