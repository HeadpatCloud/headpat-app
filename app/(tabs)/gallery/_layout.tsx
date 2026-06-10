import { Stack } from "expo-router";
import { useTheme } from "@/lib/theme/provider";

export default function GalleryLayout() {
	const { colors } = useTheme();
	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: colors.background },
			}}
		>
			<Stack.Screen name="index" options={{ title: "Gallery" }} />
			<Stack.Screen name="[galleryId]" options={{ title: "" }} />
			<Stack.Screen
				name="upload"
				options={{ title: "New post", presentation: "modal" }}
			/>
		</Stack>
	);
}
