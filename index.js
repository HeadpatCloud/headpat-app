// App entry point.
//
// Register the background location task BEFORE the router so it (and
// expo-task-manager's JS event listener) are defined on every launch — including
// the headless ("Non UI") background relaunches iOS performs to deliver location
// updates while a share is active. Bundle evaluation runs this on every launch,
// whereas the router only loads a route's module when that screen renders; on a
// cold background launch no screen renders, so registering the task here (the
// global scope, per Expo's requirement) is what guarantees the delivered
// location event has a JS handler instead of crashing the headless boot.
import "./lib/location/background-task";

import "expo-router/entry";
