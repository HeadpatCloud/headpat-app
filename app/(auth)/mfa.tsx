import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	AccessibilityInfo,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	StyleSheet,
	View,
} from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlowBackdrop } from "@/components/brand/glow-backdrop";
import { SuccessPulse } from "@/components/brand/success-pulse";
import { Button } from "@/components/ui/button";
import { Gradient } from "@/components/ui/gradient";
import { GradientText } from "@/components/ui/gradient-text";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { twoFactor } from "@/lib/auth-client";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { springs } from "@/lib/motion/springs";
import { humanizeError } from "@/lib/orpc-error";
import { useTheme } from "@/lib/theme/provider";

const CELLS = [0, 1, 2, 3, 4, 5];

function OtpCell({
	digit,
	filled,
	active,
	error,
	reduced,
}: {
	digit: string;
	filled: boolean;
	active: boolean;
	error: boolean;
	reduced: boolean;
}) {
	const { colors } = useTheme();
	const pop = useSharedValue(1);

	useEffect(() => {
		if (!filled) return;
		if (reduced) return;
		pop.value = withSequence(
			withSpring(1.06, springs.snappy),
			withSpring(1, springs.snappy),
		);
	}, [filled, reduced, pop]);

	const popStyle = useAnimatedStyle(() => ({
		transform: [{ scale: pop.value }],
	}));

	const borderColor = error
		? colors.destructive
		: filled
			? colors.primary
			: colors.border;

	return (
		<Animated.View
			style={popStyle}
			className="h-13 w-12 items-center justify-center rounded-lg border-2"
		>
			<View
				className="absolute inset-0 rounded-lg border-2"
				style={{ borderColor }}
				pointerEvents="none"
			/>
			{active && !error ? (
				<Gradient
					className="absolute inset-0 rounded-lg"
					style={StyleSheet.absoluteFill}
					borderRadius={8}
					opacity={0.9}
				>
					<View className="bg-background absolute inset-[2px] rounded-md" />
				</Gradient>
			) : null}
			<Text variant="h2" className="text-foreground">
				{digit}
			</Text>
		</Animated.View>
	);
}

function OtpCells({
	code,
	error,
	reduced,
	shake,
	onPress,
}: {
	code: string;
	error: boolean;
	reduced: boolean;
	shake: SharedValue<number>;
	onPress: () => void;
}) {
	const shakeStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: shake.value }],
	}));

	return (
		<Pressable onPress={onPress} accessibilityRole="none">
			<View className="items-center">
				<GlowBackdrop size={220} />
				<Animated.View className="flex-row gap-2" style={shakeStyle}>
					{CELLS.map((i) => (
						<OtpCell
							key={i}
							digit={code[i] ?? ""}
							filled={i < code.length}
							active={i === code.length && code.length < 6}
							error={error}
							reduced={reduced}
						/>
					))}
				</Animated.View>
			</View>
		</Pressable>
	);
}

export default function Mfa() {
	const insets = useSafeAreaInsets();
	const reduced = useReducedMotion();
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [done, setDone] = useState(false);
	const inputRef = useRef<import("react-native").TextInput>(null);
	const submittingRef = useRef(false);
	const shake = useSharedValue(0);

	const flashError = useCallback(
		(message: string) => {
			setError(message);
			if (!reduced) {
				shake.value = withSequence(
					withTiming(-8, { duration: 40 }),
					withTiming(8, { duration: 40 }),
					withTiming(-6, { duration: 40 }),
					withTiming(6, { duration: 40 }),
					withTiming(0, { duration: 40 }),
				);
			}
			setCode("");
		},
		[reduced, shake],
	);

	const submit = useCallback(
		async (value: string) => {
			if (submittingRef.current) return;
			submittingRef.current = true;
			setBusy(true);
			setError(null);
			const res = await twoFactor.verifyTotp({
				code: value.trim(),
				trustDevice: true,
			});
			setBusy(false);
			submittingRef.current = false;
			if (res.error) {
				flashError(humanizeError(res.error));
				return;
			}
			// Success: the session is established and the root redirect takes over.
			setDone(true);
			if (Platform.OS !== "web") {
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			}
		},
		[flashError],
	);

	const onChangeText = useCallback(
		(t: string) => {
			const next = t.replace(/[^0-9]/g, "").slice(0, 6);
			if (next.length > code.length && Platform.OS !== "web") {
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			}
			setError(null);
			setCode(next);
			if (next.length === 6) submit(next);
		},
		[code.length, submit],
	);

	useEffect(() => {
		const t = setTimeout(() => {
			inputRef.current?.focus();
			AccessibilityInfo.announceForAccessibility?.(
				"Enter the 6-digit code from your authenticator app.",
			);
		}, 350);
		return () => clearTimeout(t);
	}, []);

	const hasError = error != null;

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			className="bg-background flex-1"
		>
			<View
				className="flex-1 justify-center gap-6 px-6"
				style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
			>
				<View className="gap-2">
					<GradientText className="text-4xl font-extrabold">
						Two-factor
					</GradientText>
					<Text variant="muted">
						Enter the 6-digit code from your authenticator app.
					</Text>
				</View>

				{done ? (
					<View className="items-center py-2">
						<SuccessPulse size={72} />
					</View>
				) : (
					<OtpCells
						code={code}
						error={hasError}
						reduced={reduced}
						shake={shake}
						onPress={() => inputRef.current?.focus()}
					/>
				)}

				<Input
					ref={inputRef}
					value={code}
					onChangeText={onChangeText}
					keyboardType="number-pad"
					textContentType="oneTimeCode"
					autoComplete="one-time-code"
					editable={!busy && !done}
					maxLength={6}
					accessibilityLabel="Authentication code"
					className="absolute h-px w-px opacity-0"
					containerClassName="absolute"
				/>

				{error ? (
					<Text
						className="text-destructive text-center"
						accessibilityRole="alert"
					>
						{error}
					</Text>
				) : null}

				<Button
					variant="default"
					size="lg"
					fullWidth
					loading={busy}
					disabled={code.length !== 6 || busy || done}
					onPress={() => submit(code)}
					accessibilityRole="button"
					accessibilityLabel="Verify code"
				>
					<Text>{busy ? "Verifying…" : "Verify"}</Text>
				</Button>
			</View>
		</KeyboardAvoidingView>
	);
}
