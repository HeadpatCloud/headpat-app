import * as Sentry from "@sentry/react-native";

// Error reporting to the self-hosted Sentry. Imported first in index.ts so it
// is running before any other module evaluates, which is where launch-time
// failures happen. EAS builds get the DSN and the switch from the EAS
// environment; local runs stay off unless .env turns it on.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const enabled = process.env.EXPO_PUBLIC_SENTRY_ENABLED === "true" && !!dsn;

Sentry.init({
	dsn,
	enabled,
	environment: __DEV__ ? "development" : "production",
	// No IP addresses, cookies or request bodies.
	sendDefaultPii: false,
	// Errors only, no performance tracing.
	tracesSampleRate: 0,
});

export function reportError(error: unknown, context?: string): void {
	if (!enabled) return;
	Sentry.captureException(error, context ? { tags: { context } } : undefined);
}

export { Sentry };
