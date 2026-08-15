import * as Crypto from "expo-crypto";

// @tanstack/db mints collection and transaction ids through crypto.randomUUID or
// crypto.getRandomValues and throws outright when neither exists — Hermes ships
// neither, so importing a collection crashes the route that imports it. Imported
// by lib/db/persistence.ts so it runs before any createCollection call.
type CryptoLike = {
	randomUUID?: () => string;
	getRandomValues?: unknown;
};

const existing = (globalThis as { crypto?: CryptoLike }).crypto;

if (!existing?.randomUUID || !existing?.getRandomValues) {
	// defineProperty rather than assignment: on some runtimes `crypto` is a
	// read-only accessor, which would silently drop a plain assignment.
	Object.defineProperty(globalThis, "crypto", {
		configurable: true,
		writable: true,
		value: {
			...existing,
			randomUUID: existing?.randomUUID ?? Crypto.randomUUID,
			getRandomValues: existing?.getRandomValues ?? Crypto.getRandomValues,
		},
	});
}
