import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SocialButtons } from "@/components/auth/social-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { signUp } from "@/lib/auth-client";
import { humanizeError } from "@/lib/orpc-error";

export default function Register() {
	const insets = useSafeAreaInsets();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const canSubmit =
		name.trim().length > 0 &&
		email.trim().length > 0 &&
		password.length >= 8 &&
		!busy;

	const submit = async () => {
		setBusy(true);
		setError(null);
		const res = await signUp.email({
			email: email.trim(),
			password,
			name: name.trim(),
		});
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
						Create account
					</Text>
					<Text variant="muted">Join the Headpat community.</Text>
				</View>

				<View className="gap-3">
					<Input
						placeholder="Display name"
						value={name}
						onChangeText={setName}
						editable={!busy}
						accessibilityLabel="Display name"
					/>
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
						placeholder="Password (min 8 characters)"
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						autoComplete="new-password"
						textContentType="newPassword"
						editable={!busy}
						accessibilityLabel="Password"
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
					accessibilityLabel="Create account"
					accessibilityState={{ disabled: !canSubmit, busy }}
				>
					<Text>{busy ? "Creating…" : "Create account"}</Text>
				</Button>

				<SocialButtons />

				<View className="flex-row justify-center gap-1">
					<Text variant="muted">Already have an account?</Text>
					<Link href="/(auth)/login" replace>
						<Text className="text-primary font-medium">Sign in</Text>
					</Link>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}
