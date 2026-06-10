import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlowBackdrop } from "@/components/brand/glow-backdrop";
import { Button } from "@/components/ui/button";
import { Gradient } from "@/components/ui/gradient";
import { GradientText } from "@/components/ui/gradient-text";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { durations } from "@/lib/motion/springs";
import { humanizeError } from "@/lib/orpc-error";

export default function ResetPassword() {
	const insets = useSafeAreaInsets();
	const reduced = useReducedMotion();
	const { t } = useI18n();
	const { token } = useLocalSearchParams<{ token?: string }>();
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const canSubmit =
		password.length >= 8 && password === confirm && !!token && !busy;
	const mismatch = confirm.length > 0 && password !== confirm;

	const strength = useSharedValue(0);
	const shake = useSharedValue(0);

	useEffect(() => {
		const fill = Math.min(password.length / 8, 1);
		strength.value = reduced
			? fill
			: withTiming(fill, { duration: durations.base });
	}, [password, reduced, strength]);

	const strengthStyle = useAnimatedStyle(() => ({
		width: `${strength.value * 100}%`,
	}));
	const shakeStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: shake.value }],
	}));

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
			if (!reduced) {
				shake.value = withSequence(
					withTiming(-8, { duration: durations.fast / 2 }),
					withTiming(8, { duration: durations.fast / 2 }),
					withTiming(-6, { duration: durations.fast / 2 }),
					withTiming(0, { duration: durations.fast / 2 }),
				);
			}
			return;
		}
		Alert.alert(
			t("auth.resetPassword.successTitle"),
			t("auth.resetPassword.successBody"),
		);
		router.replace("/(auth)/login");
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
				<View className="items-start">
					<GlowBackdrop />
					<AnimatedEntrance index={0}>
						<GradientText className="text-4xl font-bold">
							{t("auth.resetPassword.title")}
						</GradientText>
					</AnimatedEntrance>
				</View>

				{token ? (
					<Animated.View style={shakeStyle} className="gap-5">
						<View className="gap-3">
							<AnimatedEntrance index={1}>
								<View className="gap-2">
									<Input
										placeholder={t("auth.resetPassword.passwordPlaceholder")}
										value={password}
										onChangeText={setPassword}
										secureTextEntry
										autoComplete="new-password"
										textContentType="newPassword"
										editable={!busy}
										accessibilityLabel={t("auth.resetPassword.passwordA11y")}
									/>
									<View className="bg-muted h-1.5 overflow-hidden rounded-full">
										<Animated.View style={strengthStyle} className="h-full">
											<Gradient className="h-full w-full rounded-full" />
										</Animated.View>
									</View>
								</View>
							</AnimatedEntrance>
							<AnimatedEntrance index={2}>
								<Input
									placeholder={t("auth.resetPassword.confirmPlaceholder")}
									value={confirm}
									onChangeText={setConfirm}
									secureTextEntry
									editable={!busy}
									error={
										mismatch ? t("auth.resetPassword.mismatch") : undefined
									}
									accessibilityLabel={t("auth.resetPassword.confirmA11y")}
								/>
							</AnimatedEntrance>
						</View>

						{error ? (
							<Text className="text-destructive" accessibilityRole="alert">
								{error}
							</Text>
						) : null}

						<AnimatedEntrance index={3}>
							<Button
								size="lg"
								fullWidth
								disabled={!canSubmit}
								onPress={submit}
								accessibilityRole="button"
								accessibilityLabel={t("auth.resetPassword.submit")}
								accessibilityState={{ disabled: !canSubmit, busy }}
							>
								<Text>
									{busy
										? t("auth.resetPassword.submitting")
										: t("auth.resetPassword.submit")}
								</Text>
							</Button>
						</AnimatedEntrance>
					</Animated.View>
				) : (
					<AnimatedEntrance index={1}>
						<Text className="text-muted-foreground">
							{t("auth.resetPassword.invalidLink")}
						</Text>
					</AnimatedEntrance>
				)}
			</View>
		</KeyboardAvoidingView>
	);
}
