import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import Animated, { FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlowBackdrop } from "@/components/brand/glow-backdrop";
import { SuccessPulse } from "@/components/brand/success-pulse";
import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/ui/gradient-text";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { humanizeError } from "@/lib/orpc-error";

export default function ForgotPassword() {
	const insets = useSafeAreaInsets();
	const reduced = useReducedMotion();
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
		if (res.error) {
			setError(humanizeError(res.error));
		} else {
			if (Platform.OS !== "web")
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			setSent(true);
		}
		setBusy(false);
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			className="bg-background flex-1"
		>
			<GlowBackdrop />
			<View
				className="flex-1 justify-center gap-6 px-6"
				style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
			>
				<AnimatedEntrance index={0} className="gap-2">
					<GradientText className="text-4xl font-bold">
						Reset password
					</GradientText>
					<Text variant="muted">
						{sent
							? "If that email is registered, a reset link is on its way."
							: "Enter your email and we'll send a reset link."}
					</Text>
				</AnimatedEntrance>

				{sent ? (
					<AnimatedEntrance index={1} className="items-center py-2">
						<SuccessPulse />
					</AnimatedEntrance>
				) : (
					<Animated.View
						exiting={reduced ? undefined : FadeOutUp.duration(220)}
						className="gap-5"
					>
						<AnimatedEntrance index={1}>
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
						</AnimatedEntrance>
						{error ? (
							<Text className="text-destructive" accessibilityRole="alert">
								{error}
							</Text>
						) : null}
						<AnimatedEntrance index={2}>
							<Button
								variant="default"
								size="lg"
								fullWidth
								loading={busy}
								disabled={email.trim().length === 0 || busy}
								onPress={submit}
								accessibilityRole="button"
								accessibilityLabel="Send reset link"
							>
								<Text>{busy ? "Sending…" : "Send reset link"}</Text>
							</Button>
						</AnimatedEntrance>
					</Animated.View>
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
