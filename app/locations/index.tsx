import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
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

export default function LocationsScreen() {
	const { t } = useI18n();
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
			updatedAt:
				item.updatedAt instanceof Date
					? item.updatedAt.toISOString()
					: (item.updatedAt ?? undefined),
		}));
	}, [visible.data]);
	const { locations, dispatch } = useLiveLocations(seed);

	useEffect(() => connectLocationSocket(dispatch), [dispatch]);

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
					<Marker
						key={l.userId}
						coordinate={{ latitude: l.lat, longitude: l.lng }}
						title={l.statusText ?? undefined}
					/>
				))}
			</MapView>
			{locations.length === 0 ? (
				<View className="absolute inset-x-0 bottom-10 items-center">
					<Text variant="muted">{t("locations.empty")}</Text>
				</View>
			) : null}
			<View className="absolute right-4 top-4">
				<Button
					size="sm"
					onPress={() => router.push("/locations/share" as never)}
				>
					<Text>{t("locations.manageTitle")}</Text>
				</Button>
			</View>
		</View>
	);
}
