import * as AppleAuthentication from "expo-apple-authentication";
import { Alert, Platform, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { humanizeError } from "@/lib/orpc-error";

async function social(provider: "google" | "discord") {
	try {
		await authClient.signIn.social({ provider, callbackURL: "/" });
	} catch (e) {
		Alert.alert("Sign-in failed", humanizeError(e));
	}
}

async function appleSignIn() {
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
		Alert.alert("Sign-in failed", humanizeError(e));
	}
}

export function SocialButtons() {
	return (
		<View className="gap-3">
			<View className="flex-row items-center gap-3">
				<View className="bg-border h-px flex-1" />
				<Text variant="muted" className="text-xs">
					or continue with
				</Text>
				<View className="bg-border h-px flex-1" />
			</View>
			<Button
				variant="outline"
				onPress={() => social("google")}
				accessibilityLabel="Continue with Google"
			>
				<Text>Google</Text>
			</Button>
			<Button
				variant="outline"
				onPress={() => social("discord")}
				accessibilityLabel="Continue with Discord"
			>
				<Text>Discord</Text>
			</Button>
			{Platform.OS === "ios" ? (
				<AppleAuthentication.AppleAuthenticationButton
					buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
					buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
					cornerRadius={8}
					style={{ height: 48 }}
					onPress={appleSignIn}
				/>
			) : null}
		</View>
	);
}
