import { View } from "react-native";
import { Text } from "@/components/ui/text";

// Web stub. react-native-maps is native-only — its `codegenNativeComponent` call
// is absent in react-native-web and breaks the web/node bundle expo-router uses to
// validate the route tree. Location sharing is a mobile-only feature, so on web we
// render a notice instead of importing the native map screen (app/locations/index.tsx).
export default function LocationsWebScreen() {
	return (
		<View className="flex-1 items-center justify-center p-6">
			<Text variant="muted" className="text-center">
				Location sharing is available in the Headpat mobile app.
			</Text>
		</View>
	);
}
