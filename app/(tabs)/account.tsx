import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { signOut, useSession } from "@/lib/auth-client";

export default function Account() {
	const { data } = useSession();

	return (
		<View className="bg-background flex-1 gap-4 p-6">
			<View className="gap-1">
				<Text variant="muted">Signed in as</Text>
				<Text variant="large">{data?.user?.email ?? "…"}</Text>
			</View>
			<Button
				variant="outline"
				onPress={() => signOut()}
				accessibilityRole="button"
				accessibilityLabel="Sign out"
			>
				<Text>Sign out</Text>
			</Button>
		</View>
	);
}
