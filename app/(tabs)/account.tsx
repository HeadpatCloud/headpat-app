import { Link } from "expo-router";
import { ChevronRight, Palette } from "lucide-react-native";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { signOut, useSession } from "@/lib/auth-client";

export default function Account() {
	const { data } = useSession();

	return (
		<View className="bg-background flex-1 gap-6 p-6">
			<View className="gap-1">
				<Text variant="muted">Signed in as</Text>
				<Text variant="large">{data?.user?.email ?? "…"}</Text>
			</View>

			<Link href="/appearance" asChild>
				<Button
					variant="outline"
					accessibilityRole="button"
					accessibilityLabel="Appearance settings"
					className="h-14 justify-between"
				>
					<View className="flex-row items-center gap-3">
						<Icon as={Palette} size={20} className="text-foreground" />
						<Text>Appearance</Text>
					</View>
					<Icon as={ChevronRight} size={20} className="text-muted-foreground" />
				</Button>
			</Link>

			<Button
				variant="destructive"
				onPress={() => signOut()}
				accessibilityRole="button"
				accessibilityLabel="Sign out"
				className="mt-auto"
			>
				<Text>Sign out</Text>
			</Button>
		</View>
	);
}
