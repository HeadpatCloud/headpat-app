import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { LOCATION_OPTIONS, LOCATION_TASK } from "@/lib/location/constants";

// Registered at module top level and imported from the app entry (index.js) so
// this runs on EVERY launch — including the headless background relaunches iOS
// performs to deliver location updates while a share is active. Defining the
// task lazily inside a route screen left it (and expo-task-manager's JS event
// listener) unregistered on a cold background launch, so the delivered location
// event had no JS handler and the headless boot aborted (SIGABRT).
//
// The whole body is guarded so a background fix can never throw, and locationApi
// is lazy-required so importing this module at the entry stays light (it must
// not pull the expo-router/auth graph just to register the task).
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
	try {
		if (error) return;
		const loc = (data as { locations?: Location.LocationObject[] } | undefined)
			?.locations?.[0];
		if (!loc) return;
		const { locationApi } =
			require("@/lib/location/api") as typeof import("@/lib/location/api");
		await locationApi.updateLocation({
			lat: loc.coords.latitude,
			lng: loc.coords.longitude,
			accuracy: loc.coords.accuracy ?? undefined,
			heading: loc.coords.heading ?? undefined,
			speed: loc.coords.speed ?? undefined,
		});
	} catch {
		// transient network/auth error (or nothing to do) — next fix retries
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
	try {
		// Nothing to stop if the task isn't registered (e.g. sharing was never
		// started this install).
		if (!(await TaskManager.isTaskRegisteredAsync(LOCATION_TASK))) return;
		await Location.stopLocationUpdatesAsync(LOCATION_TASK);
	} catch {
		// expo-task-manager and expo-location can disagree: the task is registered
		// with the task manager but expo-location can't stop it (TaskNotFound) —
		// e.g. a prior startLocationUpdatesAsync failed part-way and left a stale
		// registration. Clear that lingering entry so state is consistent and the
		// next start works cleanly.
		await TaskManager.unregisterTaskAsync(LOCATION_TASK).catch(() => {});
	}
}
