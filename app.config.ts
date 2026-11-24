import { existsSync } from "node:fs";
import type { ConfigContext, ExpoConfig } from "expo/config";
import { withGradleProperties } from "expo/config-plugins";

// Firebase config files (FCM push). Omitted when absent so a build doesn't fail
// on a missing file before they're added.
const androidGoogleServices = existsSync("./google-services.json")
	? "./google-services.json"
	: undefined;
const iosGoogleServices = existsSync("./GoogleService-Info.plist")
	? "./GoogleService-Info.plist"
	: undefined;

const buildConfig = ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: "Headpat",
	slug: "headpat-app",
	version: "0.11.0",
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
		[
			"expo-audio",
			{
				microphonePermission:
					"Headpat uses the microphone so you can record voice messages in chat.",
			},
		],
		[
			"@sentry/react-native/expo",
			{
				url: "https://sentry.headpat.space/",
				// Readable stack traces need source maps and debug symbols uploaded,
				// which needs SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT on the
				// build. Without a token the upload is skipped instead of failing.
				disableAutoUpload: !process.env.SENTRY_AUTH_TOKEN,
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
		["expo-build-properties", { ios: { useFrameworks: "dynamic" } }],
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
		"@react-native-community/datetimepicker",
		"expo-font",
		"expo-sqlite",
		[
			// iOS home screen widgets (WidgetKit). Android uses
			// react-native-android-widget below, so expo-widgets' own Android
			// support stays off.
			"expo-widgets",
			{
				groupIdentifier: "group.com.headpat.app",
				enableAndroid: false,
				widgets: [
					{
						name: "NextEvent",
						displayName: "Next event",
						description: "Your next headpat event at a glance",
						ios: { supportedFamilies: ["systemSmall", "systemMedium"] },
						android: null,
					},
					{
						name: "Chats",
						displayName: "Chats",
						description: "Your unread headpat chats",
						ios: {
							supportedFamilies: ["systemSmall", "systemMedium", "systemLarge"],
						},
						android: null,
					},
				],
			},
		],
		// Refreshes the iOS widgets in the background.
		"expo-background-task",
		[
			"react-native-android-widget",
			{
				fonts: [
					"./node_modules/@expo-google-fonts/fredoka/600SemiBold/Fredoka_600SemiBold.ttf",
					"./node_modules/@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf",
					"./node_modules/@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf",
				],
				widgets: [
					{
						name: "NextEvent",
						label: "Next event",
						description: "Your next headpat event at a glance",
						minWidth: "180dp",
						minHeight: "80dp",
						targetCellWidth: 3,
						targetCellHeight: 2,
						resizeMode: "horizontal|vertical",
						// Fresh data every 30 minutes (the Android minimum).
						updatePeriodMillis: 1_800_000,
					},
					{
						name: "Chats",
						label: "Chats",
						description: "Your unread headpat chats",
						minWidth: "110dp",
						minHeight: "80dp",
						targetCellWidth: 2,
						targetCellHeight: 2,
						resizeMode: "horizontal|vertical",
						updatePeriodMillis: 1_800_000,
					},
				],
			},
		],
	],
});

// Prebuild's default jvmargs (2g heap/512m metaspace) GC-thrash the Gradle
// daemon across the release bundle's 28 lintVitalAnalyzeRelease tasks. Prebuild
// always writes the default, so drop it before adding ours.
export default (context: ConfigContext): ExpoConfig =>
	withGradleProperties(buildConfig(context), (config) => {
		config.modResults = config.modResults.filter(
			(item) =>
				!(item.type === "property" && item.key === "org.gradle.jvmargs"),
		);
		config.modResults.push({
			type: "property",
			key: "org.gradle.jvmargs",
			value: "-Xmx4096m -XX:MaxMetaspaceSize=1024m",
		});
		return config;
	});
