import { existsSync } from "node:fs";
import type { ConfigContext, ExpoConfig } from "expo/config";

// Firebase config files (FCM push). Omitted when absent so a build doesn't fail
// on a missing file before they're added.
const androidGoogleServices = existsSync("./google-services.json")
	? "./google-services.json"
	: undefined;
const iosGoogleServices = existsSync("./GoogleService-Info.plist")
	? "./GoogleService-Info.plist"
	: undefined;

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: "Headpat",
	slug: "headpat-app",
	version: "0.10.0",
	orientation: "portrait",
	icon: "./assets/images/icon.png",
	scheme: "headpat",
	userInterfaceStyle: "automatic",
	// Root native view behind all screens — white flashes through transitions
	// otherwise. Matches the splash background.
	backgroundColor: "#000000",
	runtimeVersion: { policy: "appVersion" },
	assetBundlePatterns: ["**/*"],
	ios: {
		supportsTablet: true,
		bundleIdentifier: "com.headpat.app",
		appStoreUrl: "https://apps.apple.com/app/headpat/id6502715063",
		usesAppleSignIn: true,
		config: {
			usesNonExemptEncryption: false,
		},
		// Apple Declared Age Range (iOS 26+) — required to call requestAgeRangeAsync.
		entitlements: {
			"com.apple.developer.declared-age-range": true,
			// Push Notifications capability. Without this, APNs registration fails
			// with "no valid aps-environment entitlement". Local + the dev EAS
			// profile use the APNs sandbox; preview (ad-hoc) and production use
			// production APNs.
			"aps-environment":
				process.env.EAS_BUILD_PROFILE &&
				process.env.EAS_BUILD_PROFILE !== "development"
					? "production"
					: "development",
		},
		googleServicesFile: iosGoogleServices,
		associatedDomains: [
			"applinks:headpat.app",
			"applinks:headpat.place",
			"applinks:headpat.space",
			"applinks:headpat.dev",
		],
		appleTeamId: "S243K37R5M",
	},
	android: {
		package: "com.headpat.app",
		googleServicesFile: androidGoogleServices,
		// Required by expo-task-manager: the background-location task schedules a
		// persisted JobScheduler job (survives reboot), which Android refuses
		// without this permission. Neither the expo-location nor expo-task-manager
		// config plugin adds it, so declare it here.
		permissions: ["android.permission.RECEIVE_BOOT_COMPLETED"],
		adaptiveIcon: {
			foregroundImage: "./assets/images/adaptive-icon.png",
			backgroundColor: "#1D1D1B",
		},
	},
	web: {
		bundler: "metro",
		output: "static",
		favicon: "./assets/images/favicon.png",
	},
	extra: {
		router: {},
		eas: { projectId: "904378a3-321c-4abe-9c08-48274d5f6267" },
	},
	owner: "expo-headpat",
	experiments: { typedRoutes: true },
	plugins: [
		"expo-router",
		"expo-image",
		[
			"expo-splash-screen",
			{
				image: "./assets/images/headpat_splash.png",
				resizeMode: "contain",
				// The image is scaled into a box this wide (dp), not to the screen —
				// without it the mark renders at the 100dp default.
				imageWidth: 240,
				backgroundColor: "#000000",
			},
		],
		"expo-status-bar",
		"expo-secure-store",
		"expo-web-browser",
		"expo-apple-authentication",
		[
			"expo-image-picker",
			{
				photosPermission:
					"Headpat uses your photos so you can share them in the gallery and set your avatar.",
			},
		],
		"@react-native-firebase/app",
		"@react-native-firebase/messaging",
		[
			"./plugins/with-notification-icon",
			{
				// Provide an all-white, transparent silhouette PNG here (~96x96).
				icon: "./assets/images/notification-icon.png",
				color: "#008055",
			},
		],
		["expo-build-properties", { ios: { useFrameworks: "static" } }],
		[
			"expo-location",
			{
				locationWhenInUsePermission:
					"Headpat uses your location to share it with the people and communities you choose.",
				locationAlwaysAndWhenInUsePermission:
					"Headpat shares your location in the background only while you have an active share, so others can see you on the map.",
				isIosBackgroundLocationEnabled: true,
				isAndroidBackgroundLocationEnabled: true,
				isAndroidForegroundServiceEnabled: true,
			},
		],
		"@maplibre/maplibre-react-native",
	],
});
