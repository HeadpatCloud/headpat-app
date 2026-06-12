import * as WebBrowser from "expo-web-browser";
import { Alert, View } from "react-native";
import { ExternalLink, FileText } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { LEGAL_DOCS } from "@/lib/legal-docs";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { humanizeError } from "@/lib/orpc-error";

export function LegalLinks() {
	const { t } = useI18n();

	async function open(url: string) {
		try {
			await WebBrowser.openBrowserAsync(url);
		} catch (e) {
			Alert.alert(t("common.linkFailed"), humanizeError(e));
		}
	}

	return (
		<View className="gap-2">
			{LEGAL_DOCS.map((doc) => (
				<PressableScale
					key={doc.titleKey}
					onPress={() => open(doc.url)}
					haptic="selection"
					accessibilityRole="link"
					accessibilityLabel={t("account.hub.rowA11y", {
						label: t(doc.titleKey),
					})}
				>
					<View className="border-border bg-card/80 h-11 flex-row items-center gap-2.5 rounded-xl border px-3">
						<Icon as={FileText} size={16} className="text-primary" />
						<Text
							className="text-foreground flex-1 text-sm font-medium"
							numberOfLines={1}
						>
							{t(doc.titleKey)}
						</Text>
						<Icon
							as={ExternalLink}
							size={14}
							className="text-muted-foreground"
						/>
					</View>
				</PressableScale>
			))}
		</View>
	);
}
