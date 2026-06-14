import * as Location from "expo-location";

// Background task identifier (must be stable across launches).
export const LOCATION_TASK = "headpat-location-share";

// Matches the old app: balanced accuracy, ~10s / ~10m throttling.
export const LOCATION_OPTIONS: Location.LocationTaskOptions = {
	accuracy: Location.Accuracy.Balanced,
	timeInterval: 10_000,
	distanceInterval: 10,
};
