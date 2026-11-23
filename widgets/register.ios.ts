import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { refreshWidgets } from "@/widgets/update";

// iOS widgets can't fetch on their own, so the app refreshes them from a
// background task. iOS decides when it actually runs (roughly every few hours
// at best); opening the app always refreshes them too.
const TASK = "headpat-widget-refresh";

TaskManager.defineTask(TASK, async () => {
	try {
		await refreshWidgets();
		return BackgroundTask.BackgroundTaskResult.Success;
	} catch {
		return BackgroundTask.BackgroundTaskResult.Failed;
	}
});

BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 30 }).catch(() => {});
