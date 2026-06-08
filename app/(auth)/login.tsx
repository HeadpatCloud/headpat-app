import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { signIn } from "@/lib/auth-client";
import { humanizeError } from "@/lib/orpc-error";

export default function Login() {
	const insets = useSafeAreaInsets();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

	const submit = async () => {
		setBusy(true);
		setError(null);
		const res = await signIn.email({ email: email.trim(), password });
		if (res.error) setError(humanizeError(res.error));
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
						Sign in
					</Text>
					<Text variant="muted">Welcome back to Headpat.</Text>
				</View>

				<View className="gap-3">
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
					<Input
						placeholder="Password"
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						autoComplete="current-password"
						textContentType="password"
						editable={!busy}
						accessibilityLabel="Password"
						onSubmitEditing={() => canSubmit && submit()}
					/>
				</View>

				{error ? (
					<Text className="text-destructive" accessibilityRole="alert">
						{error}
					</Text>
				) : null}

				<Button
					disabled={!canSubmit}
					onPress={submit}
					accessibilityRole="button"
					accessibilityLabel="Sign in"
					accessibilityState={{ disabled: !canSubmit, busy }}
				>
					<Text>{busy ? "Signing in…" : "Sign in"}</Text>
				</Button>
			</View>
		</KeyboardAvoidingView>
	);
}
