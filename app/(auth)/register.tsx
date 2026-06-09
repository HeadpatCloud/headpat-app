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
import { Gradient } from "@/components/ui/gradient";
import { GradientText } from "@/components/ui/gradient-text";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { signUp } from "@/lib/auth-client";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { durations } from "@/lib/motion/springs";
import { humanizeError } from "@/lib/orpc-error";

const MIN_PASSWORD = 8;

export default function Register() {
	const insets = useSafeAreaInsets();
	const reduced = useReducedMotion();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const canSubmit =
		name.trim().length > 0 &&
		email.trim().length > 0 &&
		password.length >= MIN_PASSWORD &&
		!busy;

	const strength = Math.min(password.length / MIN_PASSWORD, 1);
	const fill = useSharedValue(0);
	useEffect(() => {
		fill.value = reduced
			? strength
			: withTiming(strength, { duration: durations.base });
	}, [strength, reduced, fill]);
	const fillStyle = useAnimatedStyle(() => ({
		width: `${fill.value * 100}%`,
	}));

	const shake = useSharedValue(0);
	const shakeStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: shake.value }],
	}));

	const submit = async () => {
		setBusy(true);
		setError(null);
		const res = await signUp.email({
			email: email.trim(),
			password,
			name: name.trim(),
		});
		if (res.error) {
			setError(humanizeError(res.error));
			if (!reduced) {
				shake.value = withSequence(
					withTiming(-8, { duration: 40 }),
					withTiming(8, { duration: 80 }),
					withTiming(-6, { duration: 80 }),
					withTiming(0, { duration: 40 }),
				);
			}
		}
		setBusy(false);
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			className="bg-background flex-1"
		>
			<View
				className="flex-1 justify-center gap-6 px-6"
				style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
			>
				<AnimatedEntrance index={0} className="gap-2">
					<View className="relative">
						<GlowBackdrop style={{ top: -24, left: -16 }} />
						<GradientText className="text-4xl font-bold">
							Create account
						</GradientText>
					</View>
					<Text variant="muted">Join the Headpat community.</Text>
				</AnimatedEntrance>

				<Animated.View style={shakeStyle} className="gap-5">
					<View className="gap-3">
						<AnimatedEntrance index={1}>
							<Input
								placeholder="Display name"
								value={name}
								onChangeText={setName}
								editable={!busy}
								accessibilityLabel="Display name"
							/>
						</AnimatedEntrance>
						<AnimatedEntrance index={2}>
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
						<AnimatedEntrance index={3} className="gap-1.5">
							<Input
								placeholder="Password"
								value={password}
								onChangeText={setPassword}
								secureTextEntry
								autoComplete="new-password"
								textContentType="newPassword"
								editable={!busy}
								accessibilityLabel="Password"
							/>
							<View className="bg-muted h-1 overflow-hidden rounded-full">
								<Animated.View style={fillStyle} className="h-full">
									<Gradient
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 0 }}
										borderRadius={999}
										style={{ flex: 1 }}
									/>
								</Animated.View>
							</View>
							<Text variant="small" className="text-muted-foreground px-1">
								min 8 characters
							</Text>
						</AnimatedEntrance>
					</View>

					{error ? (
						<Text className="text-destructive" accessibilityRole="alert">
							{error}
						</Text>
					) : null}

					<AnimatedEntrance index={4}>
						<Button
							size="lg"
							fullWidth
							loading={busy}
							disabled={!canSubmit}
							onPress={submit}
							accessibilityRole="button"
							accessibilityLabel="Create account"
							accessibilityState={{ disabled: !canSubmit, busy }}
						>
							<Text>{busy ? "Creating…" : "Create account"}</Text>
						</Button>
					</AnimatedEntrance>
				</Animated.View>

				<AnimatedEntrance index={5} className="gap-5">
					<SocialButtons />
					<View className="flex-row justify-center gap-1">
						<Text variant="muted">Already have an account?</Text>
						<Link href="/(auth)/login" replace>
							<Text className="text-primary font-medium">Sign in</Text>
						</Link>
					</View>
				</AnimatedEntrance>
			</View>
		</KeyboardAvoidingView>
	);
}
