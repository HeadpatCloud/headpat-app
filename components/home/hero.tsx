import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { PawPrint } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { withAlpha } from "@/lib/theme/color";
import { useTheme } from "@/lib/theme/provider";

// The website's welcome card: a soft accent wash with a big faded paw.
export const HomeHero = memo(function HomeHero({
	name,
}: {
	name: string | null;
}) {
	const { t } = useI18n();
	const { colors } = useTheme();
	const signedIn = name !== null;
	return (
		<View className="overflow-hidden rounded-3xl">
			<LinearGradient
				colors={[
					withAlpha(colors.accent, 0.15),
					withAlpha(colors.accent, 0.4),
					withAlpha(colors.accent, 0.15),
				]}
				start={{ x: 0, y: 0.5 }}
				end={{ x: 1, y: 0.5 }}
				style={StyleSheet.absoluteFill}
			/>
			<View
				pointerEvents="none"
				style={styles.paw}
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
			>
				<Icon as={PawPrint} size={220} className="text-foreground/10" />
			</View>
			<View className="gap-3.5 p-7">
				<View className="bg-card/70 self-start rounded-full px-3.5 py-1.5">
					<Text className="text-link text-sm font-extrabold">
						{t("home.heroTag")}
					</Text>
				</View>
				<Text
					role="heading"
					className="font-display text-[30px] font-semibold leading-9"
				>
					{signedIn
						? `${t("home.welcomeBack")}, ${name}`.trim()
						: t("home.guestTitle")}
				</Text>
				<Text className="text-foreground/80 text-lg font-semibold leading-7">
					{t("home.heroText")}
				</Text>
				<View className="mt-1 flex-row flex-wrap gap-2.5">
					<Pressable
						onPress={() => router.push(signedIn ? "/gallery" : "/(auth)/login")}
						accessibilityRole="button"
						className="bg-foreground active:opacity-90 min-h-11 justify-center rounded-full px-6 py-3"
					>
						<Text className="text-background font-extrabold">
							{signedIn ? t("home.browseGallery") : t("home.logIn")}
						</Text>
					</Pressable>
					{signedIn ? (
						<Pressable
							onPress={() => router.push("/events/new")}
							accessibilityRole="button"
							className="bg-card/75 active:opacity-90 min-h-11 justify-center rounded-full px-6 py-3"
						>
							<Text className="font-extrabold">{t("home.planEvent")}</Text>
						</Pressable>
					) : null}
				</View>
			</View>
		</View>
	);
});

const styles = StyleSheet.create({
	paw: {
		position: "absolute",
		right: -36,
		bottom: -44,
		transform: [{ rotate: "-12deg" }],
	},
});
