import { Stack } from "expo-router";
import { useI18n } from "@/lib/i18n/provider";
import { useStackScreenOptions } from "@/lib/navigation/stack-options";

export default function DiscoveryLayout() {
	const screenOptions = useStackScreenOptions();
	const { t } = useI18n();
	return (
		<Stack screenOptions={screenOptions}>
			<Stack.Screen
				name="sonas"
				options={{ title: t("discovery.sonasTitle") }}
			/>
			<Stack.Screen
				name="sona/[id]"
				options={{ title: t("discovery.sonasTitle") }}
			/>
			<Stack.Screen
				name="interests"
				options={{ title: t("discovery.discoveryTitle") }}
			/>
			<Stack.Screen
				name="adult"
				options={{ title: t("discovery.adultTitle") }}
			/>
			<Stack.Screen
				name="adult-profile/[userId]"
				options={{ title: t("discovery.adultTitle") }}
			/>
		</Stack>
	);
}
