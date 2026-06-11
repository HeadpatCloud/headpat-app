import { type Href, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { appRoute } from "@/lib/app-route";
import { useSession } from "@/lib/auth-client";
import { attachNotificationTapHandler, registerPushToken } from "@/lib/push";

export function usePushNotifications() {
	const { data } = useSession();
	const router = useRouter();
	const registered = useRef(false);

	// Register once the session is live; reset on sign-out so the next sign-in
	// re-registers (the device token may have moved to another account).
	useEffect(() => {
		if (data && !registered.current) {
			registered.current = true;
			registerPushToken();
		} else if (!data) {
			registered.current = false;
		}
	}, [data]);

	// Route to the linked screen when a push is tapped (live or cold start).
	useEffect(() => {
		return attachNotificationTapHandler((link) => {
			const route = appRoute(link);
			if (route) router.push(route as Href);
		});
	}, [router]);
}
