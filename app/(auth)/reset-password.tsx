import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { humanizeError } from "@/lib/orpc-error";

export default function ResetPassword() {
	const insets = useSafeAreaInsets();
	const { token } = useLocalSearchParams<{ token?: string }>();
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const canSubmit =
		password.length >= 8 && password === confirm && !!token && !busy;

	const submit = async () => {
		if (!token) return;
		setBusy(true);
		setError(null);
		const res = await authClient.resetPassword({
			newPassword: password,
			token,
		});
		setBusy(false);
		if (res.error) {
			setError(humanizeError(res.error));
			return;
		}
		Alert.alert(
			"Password updated",
			"You can now sign in with your new password.",
		);
		router.replace("/(auth)/login");
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
				<Text variant="h1" className="text-3xl">
					New password
				</Text>

				{token ? (
					<>
						<View className="gap-3">
							<Input
								placeholder="New password (min 8 characters)"
								value={password}
								onChangeText={setPassword}
								secureTextEntry
								autoComplete="new-password"
								textContentType="newPassword"
								editable={!busy}
								accessibilityLabel="New password"
							/>
							<Input
								placeholder="Confirm password"
								value={confirm}
								onChangeText={setConfirm}
								secureTextEntry
								editable={!busy}
								accessibilityLabel="Confirm password"
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
							accessibilityLabel="Update password"
						>
							<Text>{busy ? "Updating…" : "Update password"}</Text>
						</Button>
					</>
				) : (
					<Text className="text-muted-foreground">
						This reset link is invalid or has expired. Request a new one from
						the sign-in screen.
					</Text>
				)}
			</View>
		</KeyboardAvoidingView>
	);
}
