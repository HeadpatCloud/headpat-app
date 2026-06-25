import { Link, Stack } from "expo-router";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";

export default function NotFoundScreen() {
	const { t } = useI18n();
	return (
		<>
			<Stack.Screen options={{ title: t("notFound.title") }} />
			<View>
				<Text>{t("notFound.message")}</Text>

				<Link href="/">
					<Text>{t("notFound.goHome")}</Text>
				</Link>
			</View>
		</>
	);
}
