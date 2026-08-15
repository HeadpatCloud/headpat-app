import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SocialButtons } from "@/components/auth/social-buttons";
import { ChevronLeft } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/ui/gradient-text";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { Text } from "@/components/ui/text";
import { authClient, signIn } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { durations } from "@/lib/motion/springs";
import { humanizeError } from "@/lib/orpc-error";

export default function Login() {
	const insets = useSafeAreaInsets();
	const reduced = useReducedMotion();
	const { t } = useI18n();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
	const [resent, setResent] = useState(false);

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
		setUnverifiedEmail(null);
		setResent(false);
		const res = await signIn.email({ email: email.trim(), password });
		if (res.error) {
			if (res.error.code === "EMAIL_NOT_VERIFIED") {
				// the failed sign-in already triggered a fresh verification email
				setUnverifiedEmail(email.trim());
				setError(t("auth.login.unverified"));
			} else {
				setError(humanizeError(res.error));
			}
		}
		setBusy(false);
	};

	const resend = async () => {
		if (!unverifiedEmail) return;
		setBusy(true);
		const res = await authClient.sendVerificationEmail({
			email: unverifiedEmail,
		});
		if (res.error) {
			setError(humanizeError(res.error));
		} else {
			setResent(true);
			setError(null);
		}
		setBusy(false);
	};

	return (
		<KeyboardAwareScrollView
			className="flex-1"
			contentContainerClassName="gap-5 px-6"
			contentContainerStyle={{
				paddingTop: insets.top + 24,
				paddingBottom: insets.bottom + 24,
			}}
			keyboardShouldPersistTaps="handled"
		>
			{router.canGoBack() ? (
				<Pressable
					onPress={() => router.back()}
					accessibilityRole="button"
					accessibilityLabel={t("common.back")}
					hitSlop={12}
					className="self-start"
				>
					<Icon as={ChevronLeft} size={28} />
				</Pressable>
			) : null}

			<AnimatedEntrance index={0} className="gap-2">
				<GradientText className="text-4xl font-bold">
					{t("auth.login.title")}
				</GradientText>
				<Text variant="muted">{t("auth.login.subtitle")}</Text>
			</AnimatedEntrance>

			<Animated.View style={fieldsStyle} className="gap-3">
				<AnimatedEntrance index={1}>
					<Input
						placeholder={t("auth.login.emailPlaceholder")}
						value={email}
						onChangeText={setEmail}
						autoCapitalize="none"
						autoComplete="email"
						keyboardType="email-address"
						textContentType="emailAddress"
						editable={!busy}
						accessibilityLabel={t("auth.login.emailA11y")}
					/>
				</AnimatedEntrance>
				<AnimatedEntrance index={2}>
					<Input
						placeholder={t("auth.login.passwordPlaceholder")}
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						autoComplete="current-password"
						textContentType="password"
						editable={!busy}
						accessibilityLabel={t("auth.login.passwordA11y")}
						onSubmitEditing={() => canSubmit && submit()}
					/>
				</AnimatedEntrance>
			</Animated.View>

			{error ? (
				<Text className="text-destructive" accessibilityRole="alert">
					{error}
				</Text>
			) : null}

			{unverifiedEmail && !resent ? (
				<Button
					variant="outline"
					disabled={busy}
					onPress={resend}
					accessibilityRole="button"
					accessibilityLabel={t("auth.login.resend")}
				>
					<Text>{t("auth.login.resend")}</Text>
				</Button>
			) : null}
			{resent ? (
				<Text variant="muted" accessibilityRole="alert">
					{t("auth.login.resendSent")}
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
					accessibilityLabel={t("auth.login.submit")}
					accessibilityState={{ disabled: !canSubmit, busy }}
				>
					<Text>
						{busy ? t("auth.login.submitting") : t("auth.login.submit")}
					</Text>
				</Button>
			</AnimatedEntrance>

			<AnimatedEntrance index={4}>
				<SocialButtons />
			</AnimatedEntrance>

			<AnimatedEntrance index={5} className="items-center gap-3">
				<Link href="/(auth)/forgot-password">
					<View className="min-h-11 justify-center">
						<Text className="text-muted-foreground">
							{t("auth.login.forgotPassword")}
						</Text>
					</View>
				</Link>
				<View className="min-h-11 flex-row items-center gap-1">
					<Text variant="muted">{t("auth.login.newHere")}</Text>
					<Link href="/(auth)/register">
						<Text className="text-primary font-medium">
							{t("auth.login.createAccount")}
						</Text>
					</Link>
				</View>
			</AnimatedEntrance>
		</KeyboardAwareScrollView>
	);
}
