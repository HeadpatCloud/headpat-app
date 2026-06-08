import { type Href, Link } from "expo-router";
import {
	ChevronRight,
	Link2,
	type LucideIcon,
	Palette,
	ShieldCheck,
} from "lucide-react-native";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { signOut, useSession } from "@/lib/auth-client";

const ROWS: { href: Href; icon: LucideIcon; label: string }[] = [
	{ href: "/appearance", icon: Palette, label: "Appearance" },
	{ href: "/security", icon: ShieldCheck, label: "Security" },
	{ href: "/connections", icon: Link2, label: "Connections" },
];

export default function Account() {
	const { data } = useSession();

	return (
		<View className="bg-background flex-1 gap-6 p-6">
			<View className="gap-1">
				<Text variant="muted">Signed in as</Text>
				<Text variant="large">{data?.user?.email ?? "…"}</Text>
			</View>

			<View className="gap-3">
				{ROWS.map((row) => (
					<Link key={row.label} href={row.href} asChild>
						<Button
							variant="outline"
							accessibilityRole="button"
							accessibilityLabel={`${row.label} settings`}
							className="h-14 justify-between"
						>
							<View className="flex-row items-center gap-3">
								<Icon as={row.icon} size={20} className="text-foreground" />
								<Text>{row.label}</Text>
							</View>
							<Icon
								as={ChevronRight}
								size={20}
								className="text-muted-foreground"
							/>
						</Button>
					</Link>
				))}
			</View>

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
