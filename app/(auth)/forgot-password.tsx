import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { humanizeError } from "@/lib/orpc-error";

export default function ForgotPassword() {
	const insets = useSafeAreaInsets();
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [sent, setSent] = useState(false);

	const submit = async () => {
		setBusy(true);
		setError(null);
		const res = await authClient.requestPasswordReset({
			email: email.trim(),
			redirectTo: "headpat://reset-password",
		});
		if (res.error) setError(humanizeError(res.error));
		else setSent(true);
		setBusy(false);
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
						Reset password
					</Text>
					<Text variant="muted">
						{sent
							? "If that email is registered, a reset link is on its way."
							: "Enter your email and we'll send a reset link."}
					</Text>
				</View>

				{sent ? null : (
					<>
						<Input
							placeholder="Email"
							value={email}
							onChangeText={setEmail}
							autoCapitalize="none"
							autoComplete="email"
							keyboardType="email-address"
							textContentType="emailAddress"
							editable={!busy}
							accessibilityLabel="Email address"
						/>
						{error ? (
							<Text className="text-destructive" accessibilityRole="alert">
								{error}
							</Text>
						) : null}
						<Button
							disabled={email.trim().length === 0 || busy}
							onPress={submit}
							accessibilityRole="button"
							accessibilityLabel="Send reset link"
						>
							<Text>{busy ? "Sending…" : "Send reset link"}</Text>
						</Button>
					</>
				)}

				<View className="flex-row justify-center gap-1">
					<Link href="/(auth)/login" replace>
						<Text className="text-primary font-medium">Back to sign in</Text>
					</Link>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}
