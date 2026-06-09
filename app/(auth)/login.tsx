import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SocialButtons } from "@/components/auth/social-buttons";
import { GlowBackdrop } from "@/components/brand/glow-backdrop";
import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/ui/gradient-text";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { signIn } from "@/lib/auth-client";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { durations } from "@/lib/motion/springs";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { humanizeError } from "@/lib/orpc-error";

export default function Login() {
	const insets = useSafeAreaInsets();
	const reduced = useReducedMotion();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const shakeX = useSharedValue(0);
	const fieldsStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: shakeX.value }],
	}));

	const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

	useEffect(() => {
		if (!error || reduced) return;
		shakeX.value = withSequence(
			withTiming(-8, { duration: durations.fast / 2 }),
			withTiming(8, { duration: durations.fast / 2 }),
			withTiming(-6, { duration: durations.fast / 2 }),
			withTiming(0, { duration: durations.fast / 2 }),
		);
	}, [error, reduced, shakeX]);

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
				<AnimatedEntrance index={0} className="gap-2">
					<View className="self-start">
						<GlowBackdrop size={220} className="-top-12 -left-8" />
						<GradientText className="text-4xl font-bold">Sign in</GradientText>
					</View>
					<Text variant="muted">Welcome back to Headpat.</Text>
				</AnimatedEntrance>

				<Animated.View style={fieldsStyle} className="gap-3">
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
					<AnimatedEntrance index={2}>
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
					</AnimatedEntrance>
				</Animated.View>

				{error ? (
					<Text className="text-destructive" accessibilityRole="alert">
						{error}
					</Text>
				) : null}

				<AnimatedEntrance index={3}>
					<Button
						variant="default"
						size="lg"
						fullWidth
						loading={busy}
						disabled={!canSubmit}
						onPress={submit}
						accessibilityRole="button"
						accessibilityLabel="Sign in"
						accessibilityState={{ disabled: !canSubmit, busy }}
					>
						<Text>{busy ? "Signing in…" : "Sign in"}</Text>
					</Button>
				</AnimatedEntrance>

				<AnimatedEntrance index={4}>
					<SocialButtons />
				</AnimatedEntrance>

				<AnimatedEntrance index={5} className="items-center gap-3">
					<Link href="/(auth)/forgot-password">
						<View className="min-h-11 justify-center">
							<Text className="text-muted-foreground">Forgot password?</Text>
						</View>
					</Link>
					<View className="min-h-11 flex-row items-center gap-1">
						<Text variant="muted">New here?</Text>
						<Link href="/(auth)/register">
							<Text className="text-primary font-medium">Create an account</Text>
						</Link>
					</View>
				</AnimatedEntrance>
			</View>
		</KeyboardAvoidingView>
	);
}
