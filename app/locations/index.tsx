import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Text } from "@/components/ui/text";
import { locationQueries } from "@/lib/location/api";
import { type LiveLocation, useLiveLocations } from "@/lib/location/live-locations";
import { useLocationSharing } from "@/lib/location/use-location-sharing";
import { connectLocationSocket } from "@/lib/location/ws";

export default function LocationsScreen() {
	useLocationSharing(); // starts/stops background updates based on active shares
	const visible = useQuery(locationQueries.visible());
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
			updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : (item.updatedAt ?? undefined),
		}));
	}, [visible.data]);
	const { locations, dispatch } = useLiveLocations(seed);

	useEffect(() => connectLocationSocket(dispatch), [dispatch]);

	return (
		<View style={StyleSheet.absoluteFill}>
			<MapView provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill} showsUserLocation>
				{locations.map((l) => (
					<Marker key={l.userId} coordinate={{ latitude: l.lat, longitude: l.lng }} title={l.statusText ?? undefined} />
				))}
			</MapView>
			{locations.length === 0 ? (
				<View className="absolute inset-x-0 bottom-10 items-center">
					<Text variant="muted">{/* i18n added in Plan 5 */}No one is sharing with you yet.</Text>
				</View>
			) : null}
		</View>
	);
}
