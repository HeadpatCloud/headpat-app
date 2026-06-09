import { Stack } from "expo-router";

export default function GalleryLayout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ title: "Gallery" }} />
			<Stack.Screen name="[galleryId]" options={{ title: "" }} />
			<Stack.Screen
				name="upload"
				options={{ title: "New post", presentation: "modal" }}
			/>
		</Stack>
	);
}
