import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, {
	Circle,
	Marker,
	Polygon,
	PROVIDER_GOOGLE,
} from "react-native-maps";
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

type LatLng = { latitude: number; longitude: number };
type PresenceInfo = { status?: string; customStatus?: string | null };

function parseCoord(coord: string): LatLng | null {
	const [lat, lng] = coord.split(",").map(Number);
	if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
	return { latitude: lat, longitude: lng };
}

function eventPoints(coordinates: string[]): LatLng[] {
	return coordinates.map(parseCoord).filter((p): p is LatLng => p !== null);
}

function centroid(points: LatLng[]): LatLng | null {
	if (points.length === 0) return null;
	const sum = points.reduce(
		(acc, p) => ({
			latitude: acc.latitude + p.latitude,
			longitude: acc.longitude + p.longitude,
		}),
		{ latitude: 0, longitude: 0 },
	);
	return {
		latitude: sum.latitude / points.length,
		longitude: sum.longitude / points.length,
	};
}

const MARKER = 44;
const MARKER_INNER = MARKER - 6;

// A sharer's marker: their avatar (or first initial) in a circle, ringed in the
// color of their presence status. The status message shows in the callout.
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
	const fileId = profile.data?.avatarFileId ?? null;
	const letter = name.trim().charAt(0).toUpperCase() || "?";
	const ring = presenceColor(presence?.status);

	// react-native-maps repaints the marker bitmap only while tracksViewChanges is
	// true — keep it on until the avatar image paints (or briefly, for the letter).
	const [tracks, setTracks] = useState(true);
	useEffect(() => {
		if (fileId) return;
		const id = setTimeout(() => setTracks(false), 400);
		return () => clearTimeout(id);
	}, [fileId]);

	return (
		<Marker
			coordinate={{ latitude: l.lat, longitude: l.lng }}
			title={presence?.customStatus || name}
			description={presence?.customStatus ? name : undefined}
			anchor={{ x: 0.5, y: 0.5 }}
			tracksViewChanges={tracks}
		>
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
						onLoadEnd={() => setTracks(false)}
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
		</Marker>
	);
}

export default function LocationsScreen() {
	const { t } = useI18n();
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

	return (
		<View style={StyleSheet.absoluteFill}>
			<MapView
				// Google on Android; Apple Maps on iOS (avoids the react-native-google-maps
				// pod, which 1.27.2 doesn't ship and which conflicts with static frameworks).
				provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
				style={StyleSheet.absoluteFill}
				showsUserLocation
			>
				{locations.map((l) => (
					<PersonMarker
						key={`${l.userId}-${presence[l.userId]?.status ?? "offline"}`}
						l={l}
						presence={presence[l.userId]}
					/>
				))}
				{(events.data ?? []).map((e) => {
					const points = eventPoints(e.coordinates);
					const center =
						e.locationZoneMethod === "circle" ? points[0] : centroid(points);
					if (!center) return null;
					return (
						<Fragment key={e.id}>
							{e.locationZoneMethod === "polygon" && points.length >= 3 ? (
								<Polygon
									coordinates={points}
									strokeColor="#7c3aed"
									fillColor="rgba(124,58,237,0.15)"
								/>
							) : null}
							{e.locationZoneMethod === "circle" && e.circleRadius ? (
								<Circle
									center={center}
									radius={e.circleRadius}
									strokeColor="#7c3aed"
									fillColor="rgba(124,58,237,0.15)"
								/>
							) : null}
							<Marker
								coordinate={center}
								title={e.title}
								description={e.locationText ?? undefined}
								pinColor="#7c3aed"
								onCalloutPress={() => router.push(`/events/${e.id}`)}
							/>
						</Fragment>
					);
				})}
			</MapView>
			{locations.length === 0 ? (
				<View className="absolute inset-x-0 bottom-10 items-center">
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
