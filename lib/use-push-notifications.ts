import * as Notifications from "expo-notifications";
import { type Href, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { appRoute } from "@/lib/app-route";
import { useSession } from "@/lib/auth-client";
import { registerPushToken } from "@/lib/push";

export function usePushNotifications() {
	const { data } = useSession();
	const router = useRouter();
	const registered = useRef(false);
	const handledTap = useRef<string | null>(null);

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

	// Tapping a push opens the linked screen. Dedupe by request id so the
	// cold-start launch response and a live listener delivery of the same tap
	// don't navigate twice.
	useEffect(() => {
		function handle(res: Notifications.NotificationResponse | null) {
			if (
				!res ||
				res.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
			)
				return;
			const id = res.notification.request.identifier;
			if (handledTap.current === id) return;
			handledTap.current = id;
			const link = res.notification.request.content.data?.link;
			const route = typeof link === "string" ? appRoute(link) : null;
			if (route) router.push(route as Href);
		}
		// Cold start: the tap that launched the app is captured natively before
		// any JS listener mounts, so the listener alone would miss it.
		handle(Notifications.getLastNotificationResponse());
		const sub = Notifications.addNotificationResponseReceivedListener(handle);
		return () => sub.remove();
	}, [router]);
}
