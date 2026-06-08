import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { twoFactor } from "@/lib/auth-client";
import { humanizeError } from "@/lib/orpc-error";

export default function Mfa() {
	const insets = useSafeAreaInsets();
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const submit = async () => {
		setBusy(true);
		setError(null);
		const res = await twoFactor.verifyTotp({
			code: code.trim(),
			trustDevice: true,
		});
		setBusy(false);
		// On success the session is established and the root redirect takes over.
		if (res.error) setError(humanizeError(res.error));
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			className="bg-background flex-1"
		>
			<View
				className="flex-1 justify-center gap-5 px-6"
				style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
			>
				<View className="gap-2">
					<Text variant="h1" className="text-3xl">
						Two-factor
					</Text>
					<Text variant="muted">
						Enter the 6-digit code from your authenticator app.
					</Text>
				</View>

				<Input
					placeholder="123456"
					value={code}
					onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
					keyboardType="number-pad"
					textContentType="oneTimeCode"
					editable={!busy}
					accessibilityLabel="Authentication code"
					className="text-center text-2xl tracking-[8px]"
				/>

				{error ? (
					<Text className="text-destructive" accessibilityRole="alert">
						{error}
					</Text>
				) : null}

				<Button
					disabled={code.length !== 6 || busy}
					onPress={submit}
					accessibilityRole="button"
					accessibilityLabel="Verify code"
				>
					<Text>{busy ? "Verifying…" : "Verify"}</Text>
				</Button>
			</View>
		</KeyboardAvoidingView>
	);
}
