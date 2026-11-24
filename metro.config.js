const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

// Same as Expo's default config, plus the debug IDs Sentry matches source maps by.
const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
