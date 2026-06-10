import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { type Href, Link, router } from "expo-router";
import {
	ChevronRight,
	LifeBuoy,
	Link2,
	type LucideIcon,
	Palette,
	ShieldCheck,
	UserPen,
} from "@/components/icons";
import { useRef } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { signOut, useSession } from "@/lib/auth-client";

const ROWS: { href: Href; icon: LucideIcon; label: string }[] = [
	{ href: "/profile-edit", icon: UserPen, label: "Edit profile" },
	{ href: "/appearance", icon: Palette, label: "Appearance" },
	{ href: "/security", icon: ShieldCheck, label: "Security" },
	{ href: "/connections", icon: Link2, label: "Connections" },
	{ href: "/tickets", icon: LifeBuoy, label: "Support" },
];

export default function Account() {
	const { data } = useSession();
	const sheetRef = useRef<BottomSheetModal>(null);

	if (!data) {
		return (
			<View className="bg-background flex-1 gap-6 p-6">
				<View className="gap-1">
					<Text variant="large">You're browsing as a guest</Text>
					<Text variant="muted">
						Sign in to post, join communities, and sync your profile.
					</Text>
				</View>
				<View className="gap-3">
					<Button
						size="lg"
						fullWidth
						onPress={() => router.push("/(auth)/login")}
						accessibilityRole="button"
						accessibilityLabel="Sign in"
					>
						<Text>Sign in</Text>
					</Button>
					<Button
						variant="outline"
						fullWidth
						onPress={() => router.push("/(auth)/register")}
						accessibilityRole="button"
						accessibilityLabel="Create account"
					>
						<Text>Create account</Text>
					</Button>
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
			</View>
		);
	}

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
				onPress={() => sheetRef.current?.present()}
				accessibilityRole="button"
				accessibilityLabel="Sign out"
				className="mt-auto"
			>
				<Text>Sign out</Text>
			</Button>

			<Sheet ref={sheetRef}>
				<View className="gap-2">
					<Text variant="large">Sign out?</Text>
					<Text variant="muted">You'll need to sign in again next time.</Text>
					<View className="gap-3 pt-3">
						<Button
							variant="destructive"
							onPress={() => {
								sheetRef.current?.dismiss();
								signOut();
							}}
							accessibilityRole="button"
							accessibilityLabel="Confirm sign out"
						>
							<Text>Sign out</Text>
						</Button>
						<Button
							variant="outline"
							onPress={() => sheetRef.current?.dismiss()}
							accessibilityRole="button"
							accessibilityLabel="Cancel"
						>
							<Text>Cancel</Text>
						</Button>
					</View>
				</View>
			</Sheet>
		</View>
	);
}
