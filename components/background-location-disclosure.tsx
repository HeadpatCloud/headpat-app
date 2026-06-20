import { Modal, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";

// Google Play "Prominent Disclosure" for background location: a blocking dialog
// shown BEFORE the OS background-location permission is ever requested. It names
// the data (location), states it is collected in the background "even when the
// app is closed or not in use", explains the purpose, and requires an explicit
// choice (Allow / Not now). The permission is only requested via onAllow.
export function BackgroundLocationDisclosure({
	visible,
	onAllow,
	onDismiss,
}: {
	visible: boolean;
	onAllow: () => void;
	onDismiss: () => void;
}) {
	const { t } = useI18n();
	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onDismiss}
			statusBarTranslucent
		>
			<View className="flex-1 justify-center bg-black/60 p-6">
				<View className="bg-card border-border gap-4 rounded-3xl border p-6">
					<Text
						variant="large"
						className="font-bold"
						accessibilityRole="header"
					>
						{t("locations.bgDisclosureTitle")}
					</Text>
					<Text className="text-muted-foreground">
						{t("locations.bgDisclosureBody")}
					</Text>
					<View className="gap-2 pt-1">
						<Button
							size="lg"
							fullWidth
							onPress={onAllow}
							accessibilityRole="button"
							accessibilityLabel={t("locations.bgDisclosureAllow")}
						>
							<Text>{t("locations.bgDisclosureAllow")}</Text>
						</Button>
						<Button
							size="lg"
							fullWidth
							variant="ghost"
							onPress={onDismiss}
							accessibilityRole="button"
							accessibilityLabel={t("locations.bgDisclosureDecline")}
						>
							<Text>{t("locations.bgDisclosureDecline")}</Text>
						</Button>
					</View>
				</View>
			</View>
		</Modal>
	);
}
