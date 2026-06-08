import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { twoFactor, useSession } from "@/lib/auth-client";
import { humanizeError } from "@/lib/orpc-error";

export default function Security() {
	const insets = useSafeAreaInsets();
	const { data: session } = useSession();
	const enabled = !!session?.user?.twoFactorEnabled;

	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");
	const [setup, setSetup] = useState<{
		totpURI: string;
		backupCodes: string[];
	} | null>(null);
	const [busy, setBusy] = useState(false);

	const enable = async () => {
		setBusy(true);
		const res = await twoFactor.enable({ password });
		setBusy(false);
		if (res.error) {
			Alert.alert("Couldn't enable", humanizeError(res.error));
			return;
		}
		setSetup({ totpURI: res.data.totpURI, backupCodes: res.data.backupCodes });
		setPassword("");
	};

	const verify = async () => {
		setBusy(true);
		const res = await twoFactor.verifyTotp({ code: code.trim() });
		setBusy(false);
		if (res.error) {
			Alert.alert("Invalid code", humanizeError(res.error));
			return;
		}
		setSetup(null);
		setCode("");
		Alert.alert(
			"Two-factor enabled",
			"Your account is now protected with 2FA.",
		);
	};

	const disable = async () => {
		setBusy(true);
		const res = await twoFactor.disable({ password });
		setBusy(false);
		if (res.error) {
			Alert.alert("Couldn't disable", humanizeError(res.error));
			return;
		}
		setPassword("");
		Alert.alert("Two-factor disabled");
	};

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{
				padding: 16,
				paddingBottom: insets.bottom + 24,
				gap: 20,
			}}
		>
			<View className="gap-1">
				<Text variant="large">Two-factor authentication</Text>
				<Text variant="muted">
					{enabled
						? "2FA is on. Disable it with your password below."
						: "Add a TOTP authenticator app for an extra layer of security."}
				</Text>
			</View>

			{setup ? (
				<View className="bg-card border-border gap-4 rounded-xl border p-4">
					<Text className="text-foreground">
						Scan this with your authenticator app, then enter the 6-digit code.
					</Text>
					<View className="items-center rounded-lg bg-white p-4">
						<QRCode value={setup.totpURI} size={180} />
					</View>
					<View className="gap-1">
						<Text variant="small" className="text-muted-foreground uppercase">
							Backup codes
						</Text>
						<Text className="text-foreground font-mono text-sm">
							{setup.backupCodes.join("  ")}
						</Text>
					</View>
					<Input
						placeholder="123456"
						value={code}
						onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
						keyboardType="number-pad"
						accessibilityLabel="Authentication code"
						className="text-center text-xl tracking-[6px]"
					/>
					<Button
						disabled={code.length !== 6 || busy}
						onPress={verify}
						accessibilityLabel="Confirm 2FA"
					>
						<Text>{busy ? "Verifying…" : "Confirm"}</Text>
					</Button>
				</View>
			) : (
				<View className="gap-3">
					<Input
						placeholder="Current password"
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						accessibilityLabel="Current password"
					/>
					{enabled ? (
						<Button
							variant="destructive"
							disabled={password.length === 0 || busy}
							onPress={disable}
							accessibilityLabel="Disable two-factor"
						>
							<Text>{busy ? "Disabling…" : "Disable 2FA"}</Text>
						</Button>
					) : (
						<Button
							disabled={password.length === 0 || busy}
							onPress={enable}
							accessibilityLabel="Enable two-factor"
						>
							<Text>{busy ? "Enabling…" : "Enable 2FA"}</Text>
						</Button>
					)}
				</View>
			)}
		</ScrollView>
	);
}
