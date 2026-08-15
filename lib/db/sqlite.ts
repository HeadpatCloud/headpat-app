import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";

// Two databases on purpose. `collections` is a cache and gets dropped wholesale
// by Clear cache; `prefs` holds the user's own settings and must survive that.
// expo-sqlite needs a WASM bundle on web that this app doesn't ship, so both are
// null there and callers fall back to localStorage.
const isNative = Platform.OS !== "web";

export const collectionsDb: SQLiteDatabase | null = isNative
	? openDatabaseSync("headpat-db.sqlite")
	: null;

export const prefsDb: SQLiteDatabase | null = isNative
	? openDatabaseSync("headpat-prefs.sqlite")
	: null;
