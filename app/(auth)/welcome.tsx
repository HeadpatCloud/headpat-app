import { Link, useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
	FadeInDown,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { GlowBackdrop } from "@/components/brand/glow-backdrop";
import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/ui/gradient-text";
import { Text } from "@/components/ui/text";
import { durations } from "@/lib/motion/springs";
import { useReducedMotion } from "@/lib/motion/reduced-motion";

export default function Welcome() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const reduced = useReducedMotion();

	const logoOpacity = useSharedValue(reduced ? 1 : 0);
	const logoScale = useSharedValue(reduced ? 1 : 0.92);
	const glowOpacity = useSharedValue(reduced ? 1 : 0);

	useEffect(() => {
		if (reduced) {
			logoOpacity.value = 1;
			logoScale.value = 1;
			glowOpacity.value = 1;
			return;
		}
		logoOpacity.value = withTiming(1, { duration: durations.slow });
		logoScale.value = withTiming(1, { duration: durations.slow });
		glowOpacity.value = withTiming(1, { duration: durations.slow * 2 });
	}, [reduced, logoOpacity, logoScale, glowOpacity]);

	const logoStyle = useAnimatedStyle(() => ({
		opacity: logoOpacity.value,
		transform: [{ scale: logoScale.value }],
	}));
	const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

	return (
		<View
			className="bg-background flex-1 px-6"
			style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
		>
			<View className="flex-1 items-center justify-center gap-6">
				<Animated.View
					style={glowStyle}
					pointerEvents="none"
					className="absolute inset-0 items-center justify-center"
				>
					<GlowBackdrop size={320} />
				</Animated.View>

				<Animated.View style={logoStyle}>
					<Image
						source={require("../../assets/images/headpat_logo.png")}
						style={{ width: 120, height: 120 }}
						resizeMode="contain"
						accessibilityRole="image"
						accessibilityLabel="Headpat logo"
					/>
				</Animated.View>

				<View className="items-center gap-3">
					<Animated.View
						entering={reduced ? undefined : FadeInDown.duration(durations.base).delay(80)}
					>
						<GradientText className="text-center text-4xl font-extrabold tracking-tight">
							Welcome to Headpat
						</GradientText>
					</Animated.View>
					<Animated.View
						entering={reduced ? undefined : FadeInDown.duration(durations.base).delay(130)}
					>
						<Text variant="muted" className="text-center">
							The cozy place for the community — events, galleries, and friends.
						</Text>
					</Animated.View>
				</View>
			</View>

			<Animated.View
				entering={reduced ? undefined : FadeInDown.duration(durations.base).delay(180)}
				className="gap-2"
			>
				<Button
					size="lg"
					onPress={() => router.push("/(auth)/login")}
					accessibilityRole="button"
					accessibilityLabel="Get started, go to sign in"
				>
					<Text>Get started</Text>
				</Button>

				<Link href="/(auth)/login" asChild>
					<Button
						variant="link"
						accessibilityRole="link"
						accessibilityLabel="Already have an account? Sign in"
					>
						<Text>Already have an account? Sign in</Text>
					</Button>
				</Link>
			</Animated.View>
		</View>
	);
}
