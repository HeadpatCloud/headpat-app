import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlowAvatar } from "@/components/glow-avatar";
import { Camera } from "@/components/icons";
import { StorageImage } from "@/components/storage-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { withAlpha } from "@/lib/theme/color";
import { useTheme } from "@/lib/theme/provider";
import { pickImage, uploadImage } from "@/lib/upload";

const SOCIALS = [
	{ key: "discordName", label: "Discord" },
	{ key: "telegramName", label: "Telegram" },
	{ key: "furaffinityName", label: "FurAffinity" },
	{ key: "xName", label: "X" },
	{ key: "twitchName", label: "Twitch" },
	{ key: "blueskyName", label: "Bluesky" },
] as const;

export default function ProfileEdit() {
	const insets = useSafeAreaInsets();
	const { t } = useI18n();
	const { colors } = useTheme();
	const qc = useQueryClient();
	const { data: session } = useSession();
	const { data: me, isLoading } = useQuery({
		...orpc.profile.me.queryOptions({ input: {} }),
		enabled: !!session,
	});

	const [form, setForm] = useState<Record<string, string>>({});
	const [avatarFileId, setAvatarFileId] = useState<string | null>(null);
	const [bannerFileId, setBannerFileId] = useState<string | null>(null);
	const [indexing, setIndexing] = useState(true);
	const [nsfw, setNsfw] = useState(false);
	const [busy, setBusy] = useState(false);
	const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);

	useEffect(() => {
		if (!me) return;
		setForm({
			displayName: me.displayName ?? "",
			bio: me.bio ?? "",
			pronouns: me.pronouns ?? "",
			location: me.location ?? "",
			discordName: me.discordName ?? "",
			telegramName: me.telegramName ?? "",
			furaffinityName: me.furaffinityName ?? "",
			xName: me.xName ?? "",
			twitchName: me.twitchName ?? "",
			blueskyName: me.blueskyName ?? "",
		});
		setAvatarFileId(me.avatarFileId);
		setBannerFileId(me.bannerFileId);
		setIndexing(me.indexingEnabled);
		setNsfw(me.nsfwEnabled);
	}, [me]);

	const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

	const changeImage = async (kind: "avatar" | "banner") => {
		const asset = await pickImage({
			allowsEditing: true,
			aspect: kind === "avatar" ? [1, 1] : [3, 1],
		});
		if (!asset) return;
		setUploading(kind);
		try {
			const fileId = await uploadImage(kind, asset);
			if (kind === "avatar") setAvatarFileId(fileId);
			else setBannerFileId(fileId);
		} catch (e) {
			Alert.alert(t("account.edit.uploadErrorTitle"), humanizeError(e));
		} finally {
			setUploading(null);
		}
	};

	const save = async () => {
		setBusy(true);
		try {
			await client.profile.update({
				displayName: form.displayName || null,
				bio: form.bio || null,
				pronouns: form.pronouns || null,
				location: form.location || null,
				discordName: form.discordName || null,
				telegramName: form.telegramName || null,
				furaffinityName: form.furaffinityName || null,
				xName: form.xName || null,
				twitchName: form.twitchName || null,
				blueskyName: form.blueskyName || null,
				avatarFileId,
				bannerFileId,
				indexingEnabled: indexing,
				nsfwEnabled: nsfw,
			});
			qc.invalidateQueries({ queryKey: orpc.profile.me.key() });
			qc.invalidateQueries({ queryKey: orpc.profile.byUrl.key() });
			qc.invalidateQueries({ queryKey: orpc.profile.list.key() });
			router.back();
		} catch (e) {
			Alert.alert(t("account.edit.saveErrorTitle"), humanizeError(e));
		} finally {
			setBusy(false);
		}
	};

	if (isLoading) {
		return (
			<View className="bg-background flex-1">
				<Skeleton className="h-36 w-full rounded-none" />
				<View className="-mt-10 px-4">
					<Skeleton className="h-20 w-20 rounded-full" />
				</View>
				<View className="gap-4 p-4">
					<Skeleton className="h-12 w-full rounded-xl" />
					<Skeleton className="h-24 w-full rounded-xl" />
					<Skeleton className="h-12 w-full rounded-xl" />
				</View>
			</View>
		);
	}

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
			keyboardShouldPersistTaps="handled"
		>
			<PressableScale
				onPress={() => changeImage("banner")}
				accessibilityRole="button"
				accessibilityLabel={t("account.edit.changeBanner")}
			>
				<View className="bg-muted h-36 w-full items-center justify-center overflow-hidden">
					{bannerFileId ? (
						<>
							<StorageImage
								kind="banner"
								fileId={bannerFileId}
								variant="1600"
								style={{ width: "100%", height: "100%" }}
							/>
							<Gradient
								colors={
									["transparent", withAlpha(colors.background, 0.55)] as const
								}
								start={{ x: 0, y: 0 }}
								end={{ x: 0, y: 1 }}
								style={StyleSheet.absoluteFill}
								pointerEvents="none"
							/>
						</>
					) : (
						<Gradient
							opacity={0.3}
							style={StyleSheet.absoluteFill}
							pointerEvents="none"
						/>
					)}
					<View className="absolute inset-0 items-center justify-center">
						{uploading === "banner" ? (
							<ActivityIndicator color={colors.foreground} />
						) : (
							<Icon as={Camera} size={24} className="text-foreground/70" />
						)}
					</View>
				</View>
			</PressableScale>

			<View className="-mt-10 px-4">
				<PressableScale
					onPress={() => changeImage("avatar")}
					accessibilityRole="button"
					accessibilityLabel={t("account.edit.changeAvatar")}
					className="self-start"
				>
					<GlowAvatar fileId={avatarFileId} name={form.displayName} size={80} />
					<View className="bg-primary absolute bottom-0 right-0 h-7 w-7 items-center justify-center rounded-full">
						{uploading === "avatar" ? (
							<ActivityIndicator
								size="small"
								color={colors["primary-foreground"]}
							/>
						) : (
							<Icon as={Camera} size={14} className="text-primary-foreground" />
						)}
					</View>
				</PressableScale>
			</View>

			<View className="gap-4 p-4">
				<AnimatedEntrance index={0} className="gap-4">
					<Field label={t("account.edit.displayName")}>
						<Input
							value={form.displayName}
							onChangeText={(v) => set("displayName", v)}
							accessibilityLabel={t("account.edit.displayName")}
						/>
					</Field>
					<Field label={t("account.edit.bio")}>
						<Input
							value={form.bio}
							onChangeText={(v) => set("bio", v)}
							multiline
							className="h-24"
							accessibilityLabel={t("account.edit.bio")}
						/>
					</Field>
					<Field label={t("account.edit.pronouns")}>
						<Input
							value={form.pronouns}
							onChangeText={(v) => set("pronouns", v)}
							accessibilityLabel={t("account.edit.pronouns")}
						/>
					</Field>
					<Field label={t("account.edit.location")}>
						<Input
							value={form.location}
							onChangeText={(v) => set("location", v)}
							accessibilityLabel={t("account.edit.location")}
						/>
					</Field>
				</AnimatedEntrance>

				<AnimatedEntrance index={1} className="gap-4">
					<Text variant="caption" className="pt-2">
						{t("account.edit.socialHandles")}
					</Text>
					{SOCIALS.map((s) => (
						<Field key={s.key} label={s.label}>
							<Input
								value={form[s.key]}
								onChangeText={(v) => set(s.key, v)}
								autoCapitalize="none"
								accessibilityLabel={s.label}
							/>
						</Field>
					))}
				</AnimatedEntrance>

				<AnimatedEntrance index={2}>
					<Card className="gap-4 rounded-3xl p-4">
						<Text variant="caption">{t("account.edit.preferences")}</Text>
						<View className="min-h-11 flex-row items-center justify-between">
							<Text className="text-foreground flex-1">
								{t("account.edit.showInSearch")}
							</Text>
							<Toggle
								value={indexing}
								onValueChange={setIndexing}
								accessibilityLabel={t("account.edit.showInSearch")}
							/>
						</View>
						<View className="min-h-11 flex-row items-center justify-between">
							<Text className="text-foreground flex-1">
								{t("account.edit.showNsfw")}
							</Text>
							<Toggle
								value={nsfw}
								onValueChange={setNsfw}
								accessibilityLabel={t("account.edit.showNsfw")}
							/>
						</View>
					</Card>
				</AnimatedEntrance>

				<AnimatedEntrance index={3}>
					<Button
						disabled={busy}
						onPress={save}
						fullWidth
						accessibilityRole="button"
						accessibilityLabel={t("account.edit.saveA11y")}
						className="mt-2"
					>
						<Text>{busy ? t("account.edit.saving") : t("common.save")}</Text>
					</Button>
				</AnimatedEntrance>
			</View>
		</ScrollView>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<View className="gap-1.5">
			<Text variant="small" className="text-muted-foreground">
				{label}
			</Text>
			{children}
		</View>
	);
}
