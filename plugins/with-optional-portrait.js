// Keeps the portrait lock on phones without hiding the app from devices that
// can't do portrait.
//
// `orientation: "portrait"` sets android:screenOrientation="portrait" on the
// main activity. Google Play treats that as an implied, required
// android.hardware.screen.portrait feature and filters the app out for some
// tablets, Chromebooks and Android XR headsets. Declaring the feature
// explicitly as not required overrides the implied requirement.
//
// Usage in app.config.ts:
//   "./plugins/with-optional-portrait"

const { withAndroidManifest } = require("expo/config-plugins");

const FEATURE = "android.hardware.screen.portrait";

module.exports = function withOptionalPortrait(config) {
	return withAndroidManifest(config, (cfg) => {
		const manifest = cfg.modResults.manifest;
		const features = manifest["uses-feature"] ?? [];
		const existing = features.find(
			(item) => item.$["android:name"] === FEATURE,
		);

		if (existing) {
			existing.$["android:required"] = "false";
		} else {
			features.push({
				$: { "android:name": FEATURE, "android:required": "false" },
			});
		}

		manifest["uses-feature"] = features;
		return cfg;
	});
};
