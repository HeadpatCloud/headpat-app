import { format } from "date-fns/format";
import { Image, StyleSheet, View } from "react-native";
import { Aurora } from "@/components/brand/aurora";
import { LegalLinks } from "@/components/legal-links";
import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/ui/gradient-text";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";

export function EulaGate({
	updatedAt,
	onAccept,
}: {
	updatedAt: string | null;
	onAccept: () => void;
}) {
	const { t } = useI18n();
	return (
		<View
			style={StyleSheet.absoluteFill}
			className="bg-background justify-center px-6"
		>
			<Aurora />
			<View className="items-center gap-3">
				<Image
					source={require("../assets/images/headpat_logo.png")}
					style={{ width: 80, height: 80 }}
					resizeMode="contain"
					accessibilityRole="image"
				/>
				<GradientText className="text-center text-3xl font-extrabold tracking-tight">
					{t("eula.updatedTitle")}
				</GradientText>
				<Text variant="muted" className="text-center">
					{t("eula.updatedBody")}
				</Text>
				{updatedAt ? (
					<Text variant="caption">
						{t("eula.lastUpdated", {
							date: format(new Date(updatedAt), "PP"),
						})}
					</Text>
				) : null}
			</View>
			<View className="gap-3 pt-6">
				<LegalLinks />
				<Button
					size="lg"
					fullWidth
					onPress={onAccept}
					accessibilityRole="button"
					accessibilityLabel={t("eula.agree")}
				>
					<Text>{t("eula.agree")}</Text>
				</Button>
			</View>
		</View>
	);
}
