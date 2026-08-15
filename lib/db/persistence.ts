import {
	createExpoSQLitePersistence,
	type ExpoSQLiteDatabaseLike,
} from "@tanstack/expo-db-sqlite-persistence";
import type { SQLiteBindParams, SQLiteDatabase } from "expo-sqlite";
import "@/lib/db/crypto";
import { collectionsDb } from "@/lib/db/sqlite";

// The adapter still declares an expo-sqlite ^55 peer and this app is on 57, so
// the two disagree in three places: 57 requires the params argument, its
// getAllAsync returns a mutable array, and its withExclusiveTransactionAsync
// resolves to void instead of the task's value. Shim the four methods the
// adapter actually calls rather than casting the whole database and hoping.
function adapt(db: SQLiteDatabase | Transaction): ExpoSQLiteDatabaseLike {
	return {
		execAsync: (sql) => db.execAsync(sql),
		getAllAsync: <T>(sql: string, params?: unknown) =>
			db.getAllAsync<T>(sql, (params ?? []) as SQLiteBindParams) as Promise<
				readonly T[]
			>,
		runAsync: (sql, params) =>
			db.runAsync(sql, (params ?? []) as SQLiteBindParams),
		withExclusiveTransactionAsync: async <T>(
			task: (tx: ExpoSQLiteDatabaseLike) => Promise<T>,
		) => {
			let result!: T;
			await (db as SQLiteDatabase).withExclusiveTransactionAsync(async (tx) => {
				result = await task(adapt(tx));
			});
			return result;
		},
	};
}

type Transaction = Parameters<
	Parameters<SQLiteDatabase["withExclusiveTransactionAsync"]>[0]
>[0];

const database = collectionsDb;

export const persistence = database
	? createExpoSQLitePersistence({ database: adapt(database) })
	: null;
