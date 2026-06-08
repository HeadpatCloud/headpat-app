import { Link } from "expo-router";
import { Image, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function Welcome() {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="bg-background flex-1 px-6"
			style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
		>
			<View className="flex-1 items-center justify-center gap-6">
				<Image
					source={require("../../assets/images/headpat_logo.png")}
					style={{ width: 96, height: 96 }}
					resizeMode="contain"
					accessibilityRole="image"
					accessibilityLabel="Headpat logo"
				/>
				<View className="items-center gap-2">
					<Text variant="h1" className="text-4xl">
						Welcome to Headpat
					</Text>
					<Text variant="muted" className="text-center">
						The cozy place for the community — events, galleries, and friends.
					</Text>
				</View>
			</View>

			<Link href="/(auth)/login" asChild>
				<Button
					size="lg"
					accessibilityRole="button"
					accessibilityLabel="Get started, go to sign in"
				>
					<Text>Get started</Text>
				</Button>
			</Link>
		</View>
	);
}
