import * as AppleAuthentication from "expo-apple-authentication";
import { Alert, Platform, View } from "react-native";
import { Globe, MessagesSquare } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { humanizeError } from "@/lib/orpc-error";
import { RADIUS } from "@/lib/theme/foundations";

async function social(provider: "google" | "discord", failedTitle: string) {
	try {
		await authClient.signIn.social({ provider, callbackURL: "/" });
	} catch (e) {
		Alert.alert(failedTitle, humanizeError(e));
	}
}

async function appleSignIn(failedTitle: string) {
	try {
		const credential = await AppleAuthentication.signInAsync({
			requestedScopes: [
				AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
				AppleAuthentication.AppleAuthenticationScope.EMAIL,
			],
		});
		if (credential.identityToken) {
			await authClient.signIn.social({
				provider: "apple",
				idToken: { token: credential.identityToken },
			});
		}
	} catch (e) {
		if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return;
		Alert.alert(failedTitle, humanizeError(e));
	}
}

export function SocialButtons() {
	const { t } = useI18n();
	return (
		<View className="gap-3">
			<View className="flex-row items-center gap-3">
				<View className="bg-border h-px flex-1" />
				<Text variant="muted" className="text-xs">
					{t("auth.social.orContinueWith")}
				</Text>
				<View className="bg-border h-px flex-1" />
			</View>
			<Button
				variant="outline"
				onPress={() => social("google", t("auth.social.failedTitle"))}
				accessibilityLabel={t("auth.social.googleA11y")}
			>
				<Icon as={Globe} />
				<Text>Google</Text>
			</Button>
			<Button
				variant="outline"
				onPress={() => social("discord", t("auth.social.failedTitle"))}
				accessibilityLabel={t("auth.social.discordA11y")}
			>
				<Icon as={MessagesSquare} />
				<Text>Discord</Text>
			</Button>
			{Platform.OS === "ios" ? (
				<AppleAuthentication.AppleAuthenticationButton
					buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
					buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
					cornerRadius={RADIUS.sm}
					style={{ height: 48 }}
					onPress={() => appleSignIn(t("auth.social.failedTitle"))}
				/>
			) : null}
		</View>
	);
}
