import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Alert, Platform, ScrollView, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/card";
import { GradientText } from "@/components/ui/gradient-text";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { twoFactor, useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { humanizeError } from "@/lib/orpc-error";

export default function Security() {
	const insets = useSafeAreaInsets();
	const { t } = useI18n();
	const { data: session } = useSession();
	const enabled = !!session?.user?.twoFactorEnabled;

	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");
	const [setup, setSetup] = useState<{
		totpURI: string;
		backupCodes: string[];
	} | null>(null);
	const [busy, setBusy] = useState(false);

	const enable = async () => {
		setBusy(true);
		const res = await twoFactor.enable({ password });
		setBusy(false);
		if (res.error) {
			Alert.alert(
				t("account.security.enableErrorTitle"),
				humanizeError(res.error),
			);
			return;
		}
		setSetup({ totpURI: res.data.totpURI, backupCodes: res.data.backupCodes });
		setPassword("");
	};

	const verify = async () => {
		setBusy(true);
		const res = await twoFactor.verifyTotp({ code: code.trim() });
		setBusy(false);
		if (res.error) {
			Alert.alert(
				t("account.security.invalidCodeTitle"),
				humanizeError(res.error),
			);
			return;
		}
		setSetup(null);
		setCode("");
		if (Platform.OS !== "web")
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		Alert.alert(
			t("account.security.enabledTitle"),
			t("account.security.enabledBody"),
		);
	};

	const disable = async () => {
		setBusy(true);
		const res = await twoFactor.disable({ password });
		setBusy(false);
		if (res.error) {
			Alert.alert(
				t("account.security.disableErrorTitle"),
				humanizeError(res.error),
			);
			return;
		}
		setPassword("");
		Alert.alert(t("account.security.disabledTitle"));
	};

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{
				padding: 16,
				paddingBottom: insets.bottom + 24,
				gap: 20,
			}}
		>
			<AnimatedEntrance index={0}>
				<View className="gap-1">
					<View className="flex-row items-start gap-2.5">
						<View className="flex-1">
							<GradientText className="text-3xl font-extrabold leading-9 tracking-tight">
								{t("account.security.title")}
							</GradientText>
						</View>
						<Badge variant={enabled ? "tonal" : "secondary"} className="mt-2">
							{enabled ? t("account.security.on") : t("account.security.off")}
						</Badge>
					</View>
					<Text variant="muted">
						{enabled
							? t("account.security.enabledSubtitle")
							: t("account.security.disabledSubtitle")}
					</Text>
				</View>
			</AnimatedEntrance>

			{setup ? (
				<AnimatedEntrance>
					<GlowCard className="gap-4 p-4">
						<Text className="text-foreground">
							{t("account.security.scanQr")}
						</Text>
						{/* White stays hard-coded: QR scanners need a real white quiet zone. */}
						<View className="items-center rounded-xl bg-white p-4">
							<QRCode value={setup.totpURI} size={180} />
						</View>
						<View className="bg-muted gap-1.5 rounded-xl p-3">
							<Text variant="caption">{t("account.security.backupCodes")}</Text>
							<Text className="text-foreground font-mono text-sm">
								{setup.backupCodes.join("  ")}
							</Text>
						</View>
						<Input
							placeholder="123456"
							value={code}
							onChangeText={(v) =>
								setCode(v.replace(/[^0-9]/g, "").slice(0, 6))
							}
							keyboardType="number-pad"
							accessibilityLabel={t("account.security.codeA11y")}
							className="text-center text-xl tracking-[6px]"
						/>
						<Button
							disabled={code.length !== 6 || busy}
							onPress={verify}
							accessibilityLabel={t("account.security.confirmA11y")}
						>
							<Text>
								{busy
									? t("account.security.verifying")
									: t("account.security.confirm")}
							</Text>
						</Button>
					</GlowCard>
				</AnimatedEntrance>
			) : (
				<AnimatedEntrance index={1} className="gap-3">
					<Input
						placeholder={t("account.security.passwordPlaceholder")}
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						accessibilityLabel={t("account.security.passwordPlaceholder")}
					/>
					{enabled ? (
						<Button
							variant="destructive"
							disabled={password.length === 0 || busy}
							onPress={disable}
							accessibilityLabel={t("account.security.disableA11y")}
						>
							<Text>
								{busy
									? t("account.security.disabling")
									: t("account.security.disable")}
							</Text>
						</Button>
					) : (
						<Button
							disabled={password.length === 0 || busy}
							onPress={enable}
							accessibilityLabel={t("account.security.enableA11y")}
						>
							<Text>
								{busy
									? t("account.security.enabling")
									: t("account.security.enable")}
							</Text>
						</Button>
					)}
				</AnimatedEntrance>
			)}
		</ScrollView>
	);
}
