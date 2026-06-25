import { router } from "expo-router";
import { Alert, ScrollView, View } from "react-native";
import { FileClock, Flag, LifeBuoy } from "@/components/icons";
import { SettingsRow } from "@/components/settings-row";
import { GradientText } from "@/components/ui/gradient-text";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { client } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { usePlatformPermissions } from "@/lib/use-permissions";

export default function Admin() {
	const { t } = useI18n();
	const { can } = usePlatformPermissions();

	function bumpEula() {
		Alert.alert(t("eula.bump"), t("eula.bumpConfirm"), [
			{ text: t("common.cancel"), style: "cancel" },
			{
				text: t("eula.bump"),
				onPress: async () => {
					try {
						await client.legal.touch();
						Alert.alert(t("eula.bumpDone"));
					} catch (e) {
						Alert.alert(t("eula.bumpFailed"), humanizeError(e));
					}
				},
			},
		]);
	}

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerClassName="gap-5 p-6"
		>
			<View className="gap-1">
				<GradientText className="text-4xl font-extrabold leading-10 tracking-tight">
					{t("titles.admin")}
				</GradientText>
				<Text variant="muted">{t("admin.subtitle")}</Text>
			</View>
			<View className="gap-3">
				{can("reports:view") ? (
					<SettingsRow
						icon={Flag}
						label={t("titles.adminReports")}
						index={0}
						onPress={() => router.push("/admin/reports")}
						accessibilityLabel={t("account.hub.rowA11y", {
							label: t("titles.adminReports"),
						})}
					/>
				) : null}
				{can("tickets:view") ? (
					<SettingsRow
						icon={LifeBuoy}
						label={t("titles.adminTickets")}
						index={1}
						onPress={() => router.push("/admin/tickets")}
						accessibilityLabel={t("account.hub.rowA11y", {
							label: t("titles.adminTickets"),
						})}
					/>
				) : null}
				{can("legal:manage") ? (
					<SettingsRow
						icon={FileClock}
						label={t("eula.bump")}
						index={2}
						onPress={bumpEula}
						accessibilityLabel={t("account.hub.rowA11y", {
							label: t("eula.bump"),
						})}
					/>
				) : null}
			</View>
		</ScrollView>
	);
}
