import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { locationApi } from "@/lib/location/api";
import { LOCATION_OPTIONS, LOCATION_TASK } from "@/lib/location/constants";

// Posts each background fix to the server. The server no-ops if there is no
// active share or the user is paused (defense in depth).
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
	if (error) return;
	const loc = (data as { locations?: Location.LocationObject[] } | undefined)
		?.locations?.[0];
	if (!loc) return;
	try {
		await locationApi.updateLocation({
			lat: loc.coords.latitude,
			lng: loc.coords.longitude,
			accuracy: loc.coords.accuracy ?? undefined,
			heading: loc.coords.heading ?? undefined,
			speed: loc.coords.speed ?? undefined,
		});
	} catch {
		// transient network error — next fix will retry
	}
});

export async function startSharingUpdates(): Promise<void> {
	if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) return;
	await Location.startLocationUpdatesAsync(LOCATION_TASK, {
		...LOCATION_OPTIONS,
		foregroundService: {
			notificationTitle: "Sharing your location",
			notificationBody:
				"Headpat is sharing your location with your active shares.",
		},
	});
}

export async function stopSharingUpdates(): Promise<void> {
	if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
		await Location.stopLocationUpdatesAsync(LOCATION_TASK);
	}
}
