import { useCallback, useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { client } from "@/lib/orpc";
import { useTheme } from "@/lib/theme/provider";
import {
	readWidgetSettings,
	type StoredWidgetSettings,
	type WidgetSettings,
	withDefaults,
	writeWidgetSettings,
} from "@/widgets/settings";
import { redrawWidgets, refreshWidgets } from "@/widgets/update";

// One in-memory copy shared by the settings screen and the sync hook, backed by
// the synchronous kv store the background widget handler also reads.
let current: StoredWidgetSettings = readWidgetSettings();
const listeners = new Set<() => void>();

function setCurrent(next: StoredWidgetSettings) {
	current = next;
	writeWidgetSettings(next);
	for (const l of listeners) l();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/**
 * Saves the current settings to the account. A failure leaves them pending,
 * so the next sync retries instead of letting the account's older copy win.
 */
async function uploadSettings(): Promise<void> {
	const sent = current;
	try {
		await client.widget.saveSettings(sent.settings);
		if (current === sent) setCurrent({ ...sent, pending: false });
	} catch {}
}

/** Widget settings plus a setter that saves locally and, when signed in, to the account. */
export function useWidgetSettings() {
	const stored = useSyncExternalStore(subscribe, () => current);
	const { data: session } = useSession();
	const signedIn = !!session?.user;

	const update = useCallback(
		(patch: (prev: WidgetSettings) => WidgetSettings) => {
			const settings = patch(current.settings);
			const dataChanged =
				settings.nextEvent.includePublic !==
					current.settings.nextEvent.includePublic ||
				settings.chats.showPreviews !== current.settings.chats.showPreviews;
			const widgetsChanged =
				dataChanged || settings.theme !== current.settings.theme;
			setCurrent({ settings, changedAt: Date.now(), pending: signedIn });
			if (signedIn) uploadSettings();
			if (dataChanged) return refreshWidgets().catch(() => {});
			if (widgetsChanged) return redrawWidgets().catch(() => {});
			return Promise.resolve();
		},
		[signedIn],
	);

	return { settings: stored.settings, update };
}

/**
 * Keeps placed widgets current while the app runs: fresh data on launch, on
 * sign-in or out, and whenever the app comes back or goes to the background
 * (so an event you just joined is on the home screen you return to), plus a
 * redraw whenever the theme or language changes. Also brings the account's widget settings onto
 * this device, or uploads this device's choices if the account has none yet.
 */
export function useWidgetSync() {
	const { data: session, isPending } = useSession();
	const userId = session?.user?.id ?? null;
	const { scheme, activeTheme, customThemes, mode } = useTheme();
	const { locale } = useI18n();

	useEffect(() => {
		if (isPending) return;
		let cancelled = false;
		(async () => {
			// Unsaved changes belong to the account they were made on.
			if (!userId && current.pending)
				setCurrent({ ...current, pending: false });
			if (userId) {
				try {
					const remote = await client.widget.settings();
					if (cancelled) return;
					const accountEmpty =
						remote.updatedAt === null && current.changedAt !== null;
					if (accountEmpty || current.pending) {
						await uploadSettings();
					} else {
						setCurrent({
							settings: withDefaults(remote.settings),
							changedAt: remote.updatedAt
								? new Date(remote.updatedAt).getTime()
								: null,
						});
					}
				} catch {}
			}
			if (!cancelled) await refreshWidgets().catch(() => {});
		})();
		return () => {
			cancelled = true;
		};
	}, [userId, isPending]);

	useEffect(() => {
		const sub = AppState.addEventListener("change", (state) => {
			if (state === "active" || state === "background") {
				refreshWidgets().catch(() => {});
			}
		});
		return () => sub.remove();
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: these are redraw triggers; the widget code reads them from the kv store
	useEffect(() => {
		redrawWidgets().catch(() => {});
	}, [scheme, activeTheme, customThemes, mode, locale]);
}
