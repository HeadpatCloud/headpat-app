import { appRoute } from "@/lib/app-route";

// Universal links arrive as web paths (/gallery/123, /de/events/456); route them
// to the matching screen. Unmapped paths are left alone so the router can decide
// (custom-scheme links already use app paths).
export function redirectSystemPath({
	path,
}: {
	path: string;
	initial: boolean;
}) {
	return appRoute(path) ?? path;
}
