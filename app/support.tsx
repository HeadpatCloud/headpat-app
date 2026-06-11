import * as WebBrowser from "expo-web-browser";
import { Alert, Linking, ScrollView, View } from "react-native";
import {
	Globe,
	type LucideIcon,
	Mail,
	MessageCircle,
} from "@/components/icons";
import { SettingsRow } from "@/components/settings-row";
import { GradientText } from "@/components/ui/gradient-text";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { humanizeError } from "@/lib/orpc-error";

const LINKS: {
	icon: LucideIcon;
	titleKey: string;
	value?: string;
	url: string;
	inApp?: boolean;
}[] = [
	{
		icon: MessageCircle,
		titleKey: "support.discord",
		url: "https://discord.com/invite/EaQTEKRg2A",
	},
	{
		icon: Mail,
		titleKey: "support.email",
		value: "help@headpat.place",
		url: "mailto:help@headpat.place",
	},
	{
		icon: Globe,
		titleKey: "support.website",
		value: "headpat.place",
		url: "https://headpat.place",
		inApp: true,
	},
];

export default function Support() {
	const { t } = useI18n();

	async function open(link: (typeof LINKS)[number]) {
		try {
			if (link.inApp) await WebBrowser.openBrowserAsync(link.url);
			else await Linking.openURL(link.url);
		} catch (e) {
			Alert.alert(t("common.linkFailed"), humanizeError(e));
		}
	}

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerClassName="gap-5 p-6"
		>
			<View className="gap-1">
				<GradientText className="text-4xl font-extrabold leading-10 tracking-tight">
					{t("titles.support")}
				</GradientText>
				<Text variant="muted">{t("support.subtitle")}</Text>
			</View>
			<View className="gap-3">
				{LINKS.map((link, i) => (
					<SettingsRow
						key={link.titleKey}
						icon={link.icon}
						label={t(link.titleKey)}
						value={link.value}
						index={i}
						external
						onPress={() => open(link)}
					/>
				))}
			</View>
		</ScrollView>
	);
}
