import { View } from "react-native";
import { Text } from "@/components/ui/text";

// Web stub. The native manage screen pulls in @react-native-community/datetimepicker
// and the background-location task (expo-task-manager), which don't bundle on web.
// Location sharing is mobile-only — render a notice instead of the native screen
// (app/locations/share.tsx).
export default function ManageSharesWebScreen() {
	return (
		<View className="flex-1 items-center justify-center p-6">
			<Text variant="muted" className="text-center">
				Manage location sharing in the Headpat mobile app.
			</Text>
		</View>
	);
}
