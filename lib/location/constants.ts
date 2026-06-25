import * as Location from "expo-location";

// Background task identifier (must be stable across launches).
export const LOCATION_TASK = "headpat-location-share";

// One OS watcher feeds every share, so tune it for battery, not freshness:
// - Balanced accuracy avoids the high-power GPS fix that BestForNavigation forces.
// - Larger time/distance thresholds mean fewer wake-ups + server posts; for
//   social sharing, ~25 m granularity every ~15 s is plenty.
// - On iOS, let the OS pause updates while the user is stationary (the biggest
//   win — no fixes when nothing is moving) and resume on movement.
export const LOCATION_OPTIONS: Location.LocationTaskOptions = {
	accuracy: Location.Accuracy.Balanced,
	timeInterval: 15_000,
	distanceInterval: 15,
	activityType: Location.ActivityType.Other,
	pausesUpdatesAutomatically: true,
};
