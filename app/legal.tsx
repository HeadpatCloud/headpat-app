import * as WebBrowser from "expo-web-browser";
import { Alert, ScrollView, View } from "react-native";
import { FileText } from "@/components/icons";
import { SettingsRow } from "@/components/settings-row";
import { GradientText } from "@/components/ui/gradient-text";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { humanizeError } from "@/lib/orpc-error";

const DOCS = [
	{ titleKey: "legal.eula", url: "https://headpat.place/legal/eula" },
	{
		titleKey: "legal.terms",
		url: "https://headpat.place/legal/termsofservice.pdf",
	},
	{
		titleKey: "legal.privacy",
		url: "https://headpat.place/legal/privacypolicy",
	},
];

export default function Legal() {
	const { t } = useI18n();

	async function open(url: string) {
		try {
			await WebBrowser.openBrowserAsync(url);
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
					{t("titles.legal")}
				</GradientText>
				<Text variant="muted">{t("legal.subtitle")}</Text>
			</View>
			<View className="gap-3">
				{DOCS.map((doc, i) => (
					<SettingsRow
						key={doc.titleKey}
						icon={FileText}
						label={t(doc.titleKey)}
						index={i}
						external
						onPress={() => open(doc.url)}
					/>
				))}
			</View>
		</ScrollView>
	);
}
