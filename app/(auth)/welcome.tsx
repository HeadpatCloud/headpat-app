import { router } from "expo-router";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Aurora } from "@/components/brand/aurora";
import {
	CalendarDays,
	ChevronRight,
	Images,
	type LucideIcon,
	ShoppingBag,
	UsersRound,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gradient } from "@/components/ui/gradient";
import { GradientText } from "@/components/ui/gradient-text";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
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
	const { t } = useI18n();
	const inner = (
		<Card className="flex-row items-center gap-3 rounded-2xl p-4">
			<View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full">
				<Gradient
					opacity={soon ? 0.08 : 0.18}
					style={StyleSheet.absoluteFill}
				/>
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
								{t("auth.welcome.soon")}
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
	const { t } = useI18n();
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
						accessibilityLabel={t("auth.welcome.logoA11y")}
					/>
					<GradientText className="text-center text-3xl font-extrabold tracking-tight">
						{t("auth.welcome.title")}
					</GradientText>
					<Text variant="muted" className="text-center">
						{t("auth.welcome.subtitle")}
					</Text>
				</AnimatedEntrance>

				<AnimatedEntrance index={1} className="gap-2">
					<Text variant="caption" className="text-muted-foreground">
						{t("auth.welcome.explore")}
					</Text>
					<AreaCard
						icon={Images}
						title={t("auth.welcome.gallery")}
						subtitle={t("auth.welcome.gallerySubtitle")}
						onPress={() => router.push("/(tabs)/gallery")}
					/>
					<AreaCard
						icon={CalendarDays}
						title={t("auth.welcome.events")}
						subtitle={t("auth.welcome.eventsSubtitle")}
						onPress={() => router.push("/(tabs)/events")}
					/>
					<AreaCard
						icon={UsersRound}
						title={t("auth.welcome.communities")}
						subtitle={t("auth.welcome.communitiesSubtitle")}
						onPress={() => router.push("/community")}
					/>
					<AreaCard
						icon={ShoppingBag}
						title={t("auth.welcome.marketplace")}
						subtitle={t("auth.welcome.marketplaceSubtitle")}
						soon
					/>
				</AnimatedEntrance>

				<AnimatedEntrance index={2} className="gap-2">
					<Button
						size="lg"
						fullWidth
						onPress={() => router.push("/(auth)/login")}
						accessibilityRole="button"
						accessibilityLabel={t("auth.welcome.signIn")}
					>
						<Text>{t("auth.welcome.signIn")}</Text>
					</Button>
					<Button
						variant="link"
						onPress={() => router.push("/(auth)/register")}
						accessibilityRole="link"
						accessibilityLabel={t("auth.welcome.createAccountA11y")}
					>
						<Text>{t("auth.welcome.newHere")}</Text>
					</Button>
				</AnimatedEntrance>
			</ScrollView>
		</View>
	);
}
