import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { prefsDb } from "@/lib/db/sqlite";

/**
 * Synchronous key/value storage for user preferences.
 *
 * Sync matters: theme, locale, the age gate and the EULA gate all decide what to
 * render on the first frame. AsyncStorage forced a render with no value followed
 * by a correction, which is the flash. expo-sqlite (native) and localStorage
 * (web) both read synchronously, so those reads happen before first paint.
 */

const MIGRATED = "kv-migrated-from-async-storage";

// Keys previously owned by AsyncStorage. Copied across once so nobody is asked to
// re-accept the EULA, redo the age gate, or loses their custom themes.
const LEGACY_KEYS = [
	"hp-onboarded",
	"hp-eula-accepted-at",
	"hp-age-cleared-at",
	"hp-show-nsfw",
	"hp-locale",
	"hp-theme-mode",
	"hp-active-theme",
	"hp-custom-themes",
	"headpat-cache-v2",
];

const webStore = Platform.OS === "web" ? globalThis.localStorage : undefined;

if (prefsDb) {
	prefsDb.execSync(
		"CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
	);
}

export function kvGet(key: string): string | null {
	if (prefsDb) {
		const row = prefsDb.getFirstSync<{ value: string }>(
			"SELECT value FROM kv WHERE key = ?",
			key,
		);
		return row?.value ?? null;
	}
	return webStore?.getItem(key) ?? null;
}

export function kvSet(key: string, value: string): void {
	if (prefsDb) {
		prefsDb.runSync(
			"INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
			key,
			value,
		);
		return;
	}
	webStore?.setItem(key, value);
}

export function kvRemove(key: string): void {
	if (prefsDb) {
		prefsDb.runSync("DELETE FROM kv WHERE key = ?", key);
		return;
	}
	webStore?.removeItem(key);
}

/**
 * One-shot copy of the old AsyncStorage values. Deliberately keeps the dependency
 * alive for one release: dropping it immediately would silently reset everyone's
 * gates and themes. `require` is lazy so an already-migrated launch never pulls
 * the module into the startup path.
 */
export async function migrateFromAsyncStorage(): Promise<void> {
	if (kvGet(MIGRATED)) return;
	try {
		const AsyncStorage = (
			require("@react-native-async-storage/async-storage") as {
				default: typeof import("@react-native-async-storage/async-storage").default;
			}
		).default;
		const pairs = await AsyncStorage.multiGet(LEGACY_KEYS);
		for (const [key, value] of pairs) {
			if (value != null && kvGet(key) === null) kvSet(key, value);
		}
		await AsyncStorage.multiRemove(LEGACY_KEYS).catch(() => {});
	} catch {
		// Nothing to migrate (fresh install, or the module isn't in this build).
	}
	kvSet(MIGRATED, "1");
}

/**
 * True once preferences are readable. Every consumer reads synchronously during
 * its first render, so the tree must not mount until the one-time copy has run —
 * otherwise the upgrade launch renders defaults and only picks the real values up
 * on the next start. Already-migrated launches resolve on the first tick, since
 * the check itself is a synchronous read.
 */
export function useKvReady(): boolean {
	const [ready, setReady] = useState(() => kvGet(MIGRATED) != null);

	useEffect(() => {
		if (ready) return;
		let cancelled = false;
		migrateFromAsyncStorage().finally(() => {
			if (!cancelled) setReady(true);
		});
		return () => {
			cancelled = true;
		};
	}, [ready]);

	return ready;
}
