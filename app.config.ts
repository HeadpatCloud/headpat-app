export default ({ config }: { config: any }) => ({
  ...config,
  name: "Headpat",
  slug: "headpat-app",
  version: "0.8.15",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "headpat",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  runtimeVersion: { policy: "appVersion" },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.headpat.app",
    appStoreUrl: "https://apps.apple.com/app/headpat/id6502715063",
    config: { usesNonExemptEncryption: false },
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
    edgeToEdgeEnabled: true,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
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
    [
      "expo-splash-screen",
      {
        image: "./assets/images/headpat_splash.png",
        resizeMode: "cover",
        backgroundColor: "#000000",
      },
    ],
    "expo-status-bar",
    "expo-secure-store",
    "expo-web-browser",
  ],
});
