import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { humanizeError } from "@/lib/orpc-error";

type Account = {
	id: string;
	accountId: string;
	providerId?: string;
	provider?: string;
};

const LABELS: Record<string, string> = {
	credential: "Email & password",
	google: "Google",
	discord: "Discord",
	apple: "Apple",
	github: "GitHub",
	twitch: "Twitch",
	eurofurence: "Eurofurence",
};

const providerOf = (a: Account) => a.providerId ?? a.provider ?? "unknown";

export default function Connections() {
	const insets = useSafeAreaInsets();
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		setLoading(true);
		const res = await authClient.listAccounts();
		if (res.data) setAccounts(res.data as Account[]);
		setLoading(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const unlink = (a: Account) => {
		const provider = providerOf(a);
		Alert.alert("Disconnect", `Disconnect ${LABELS[provider] ?? provider}?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Disconnect",
				style: "destructive",
				onPress: async () => {
					const res = await authClient.unlinkAccount({
						providerId: provider,
						accountId: a.accountId,
					});
					if (res.error)
						Alert.alert("Couldn't disconnect", humanizeError(res.error));
					else load();
				},
			},
		]);
	};

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{
				padding: 16,
				paddingBottom: insets.bottom + 24,
				gap: 12,
			}}
		>
			<Text variant="muted">Sign-in methods connected to your account.</Text>
			{loading ? (
				<Text variant="muted">Loading…</Text>
			) : (
				accounts.map((a) => {
					const provider = providerOf(a);
					const canUnlink = provider !== "credential" && accounts.length > 1;
					return (
						<View
							key={a.id}
							className="bg-card border-border flex-row items-center justify-between rounded-lg border p-3"
						>
							<Text className="text-foreground font-medium">
								{LABELS[provider] ?? provider}
							</Text>
							{canUnlink ? (
								<Button
									variant="outline"
									size="sm"
									onPress={() => unlink(a)}
									accessibilityLabel={`Disconnect ${LABELS[provider] ?? provider}`}
								>
									<Text>Disconnect</Text>
								</Button>
							) : null}
						</View>
					);
				})
			)}
		</ScrollView>
	);
}
