// Sets the Android notification small icon for FCM (@react-native-firebase/messaging).
//
// On Android 8+, a full-color launcher icon renders as a white square in the status
// bar. FCM needs a dedicated *white, transparent* monochrome icon wired via the
// `com.google.firebase.messaging.default_notification_icon` meta-data.
//
// Usage in app.config.ts:
//   ["./plugins/with-notification-icon", { icon: "./assets/images/notification-icon.png", color: "#E84393" }]
//
// The `icon` must be an all-white silhouette on a transparent background (~96x96).
// If the file is missing, the plugin no-ops (so prebuild never breaks) and warns.

const {
	withAndroidManifest,
	withDangerousMod,
	withAndroidColors,
	AndroidConfig,
} = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const DRAWABLE = "notification_icon";
const COLOR_RES = "notification_icon_color";

module.exports = function withNotificationIcon(config, props = {}) {
	const iconPath = props.icon ?? "./assets/images/notification-icon.png";
	const color = props.color ?? "#FFFFFF";
	const absIcon = path.resolve(process.cwd(), iconPath);

	if (!fs.existsSync(absIcon)) {
		console.warn(
			`[with-notification-icon] "${iconPath}" not found — skipping. Add a white, ` +
				"transparent PNG there to set the Android notification icon.",
		);
		return config;
	}

	// 1. Copy the icon into res/drawable/notification_icon.png.
	config = withDangerousMod(config, [
		"android",
		(cfg) => {
			const dir = path.join(
				cfg.modRequest.platformProjectRoot,
				"app/src/main/res/drawable",
			);
			fs.mkdirSync(dir, { recursive: true });
			fs.copyFileSync(absIcon, path.join(dir, `${DRAWABLE}.png`));
			return cfg;
		},
	]);

	// 2. Notification tint color resource.
	config = withAndroidColors(config, (cfg) => {
		cfg.modResults = AndroidConfig.Colors.setColorItem(
			AndroidConfig.Resources.buildResourceItem({
				name: COLOR_RES,
				value: color,
			}),
			cfg.modResults,
		);
		return cfg;
	});

	// 3. FCM default notification icon + color meta-data.
	config = withAndroidManifest(config, (cfg) => {
		const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
		AndroidConfig.Manifest.addMetaDataItemToMainApplication(
			app,
			"com.google.firebase.messaging.default_notification_icon",
			`@drawable/${DRAWABLE}`,
			"resource",
		);
		AndroidConfig.Manifest.addMetaDataItemToMainApplication(
			app,
			"com.google.firebase.messaging.default_notification_color",
			`@color/${COLOR_RES}`,
			"resource",
		);
		return cfg;
	});

	return config;
};
