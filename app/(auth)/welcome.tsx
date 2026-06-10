import { router } from "expo-router";
import {
	CalendarDays,
	ChevronRight,
	Images,
	type LucideIcon,
	ShoppingBag,
	UsersRound,
} from "@/components/icons";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Aurora } from "@/components/brand/aurora";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gradient } from "@/components/ui/gradient";
import { GradientText } from "@/components/ui/gradient-text";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";

function AreaCard({
	icon,
	title,
	subtitle,
	onPress,
	soon,
}: {
	icon: LucideIcon;
	title: string;
	subtitle: string;
	onPress?: () => void;
	soon?: boolean;
}) {
	const inner = (
		<Card className="flex-row items-center gap-3 rounded-2xl p-4">
			<View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full">
				<Gradient opacity={soon ? 0.08 : 0.18} style={StyleSheet.absoluteFill} />
				<Icon
					as={icon}
					size={22}
					className={soon ? "text-muted-foreground" : "text-primary"}
				/>
			</View>
			<View className="flex-1 gap-0.5">
				<View className="flex-row items-center gap-2">
					<Text variant="large">{title}</Text>
					{soon ? (
						<View className="bg-muted rounded-full px-2 py-0.5">
							<Text variant="caption" className="text-muted-foreground">
								Soon
							</Text>
						</View>
					) : null}
				</View>
				<Text variant="muted" numberOfLines={1}>
					{subtitle}
				</Text>
			</View>
			{soon ? null : (
				<Icon as={ChevronRight} size={20} className="text-muted-foreground" />
			)}
		</Card>
	);

	if (soon || !onPress) {
		return <View className="opacity-60">{inner}</View>;
	}
	return (
		<PressableScale
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={title}
		>
			{inner}
		</PressableScale>
	);
}

export default function Welcome() {
	const insets = useSafeAreaInsets();
	return (
		<View className="bg-background flex-1">
			<Aurora />
			<ScrollView
				contentContainerStyle={{
					paddingTop: insets.top + 24,
					paddingBottom: insets.bottom + 24,
					paddingHorizontal: 24,
					gap: 24,
				}}
			>
				<AnimatedEntrance index={0} className="items-center gap-3">
					<Image
						source={require("../../assets/images/headpat_logo.png")}
						style={{ width: 84, height: 84 }}
						resizeMode="contain"
						accessibilityRole="image"
						accessibilityLabel="Headpat logo"
					/>
					<GradientText className="text-center text-3xl font-extrabold tracking-tight">
						Welcome to Headpat
					</GradientText>
					<Text variant="muted" className="text-center">
						Explore freely — sign in when you're ready.
					</Text>
				</AnimatedEntrance>

				<AnimatedEntrance index={1} className="gap-2">
					<Text variant="caption" className="text-muted-foreground">
						Explore
					</Text>
					<AreaCard
						icon={Images}
						title="Gallery"
						subtitle="Art, photos & posts"
						onPress={() => router.push("/(tabs)/gallery")}
					/>
					<AreaCard
						icon={CalendarDays}
						title="Events"
						subtitle="Meetups & happenings"
						onPress={() => router.push("/(tabs)/events")}
					/>
					<AreaCard
						icon={UsersRound}
						title="Communities"
						subtitle="Groups & friends"
						onPress={() => router.push("/(tabs)/community")}
					/>
					<AreaCard
						icon={ShoppingBag}
						title="Marketplace"
						subtitle="Buy & sell"
						soon
					/>
				</AnimatedEntrance>

				<AnimatedEntrance index={2} className="gap-2">
					<Button
						size="lg"
						fullWidth
						onPress={() => router.push("/(auth)/login")}
						accessibilityRole="button"
						accessibilityLabel="Sign in"
					>
						<Text>Sign in</Text>
					</Button>
					<Button
						variant="link"
						onPress={() => router.push("/(auth)/register")}
						accessibilityRole="link"
						accessibilityLabel="Create an account"
					>
						<Text>New here? Create an account</Text>
					</Button>
				</AnimatedEntrance>
			</ScrollView>
		</View>
	);
}
