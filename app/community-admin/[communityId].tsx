import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/empty-state";
import { GlowAvatar } from "@/components/glow-avatar";
import { Camera, Hash, ShieldCheck, Trash2 } from "@/components/icons";
import { StorageImage } from "@/components/storage-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { useTheme } from "@/lib/theme/provider";
import { pickImage, uploadImage } from "@/lib/upload";
import { usePlatformPermissions } from "@/lib/use-permissions";

export default function CommunityAdmin() {
	const { communityId } = useLocalSearchParams<{ communityId: string }>();
	const insets = useSafeAreaInsets();
	const qc = useQueryClient();
	const { t } = useI18n();
	const { colors } = useTheme();

	const { data: session } = useSession();
	const myRole = useQuery({
		...orpc.community.myRoleIn.queryOptions({ input: { communityId } }),
		enabled: !!session,
	});
	const community = useQuery(
		orpc.community.byId.queryOptions({ input: { communityId } }),
	);

	const role = myRole.data?.role;
	const { can } = usePlatformPermissions();
	const isPlatformMod = can("communities:edit");
	const canManage =
		role === "admin" ||
		role === "moderator" ||
		role === "owner" ||
		isPlatformMod;
	const canEditSettings = role === "admin" || role === "owner" || isPlatformMod;

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [tags, setTags] = useState("");
	const [avatarFileId, setAvatarFileId] = useState<string | null>(null);
	const [bannerFileId, setBannerFileId] = useState<string | null>(null);
	const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
	const [savingSettings, setSavingSettings] = useState(false);

	useEffect(() => {
		const c = community.data;
		if (!c) return;
		setName(c.name);
		setDescription(c.description ?? "");
		setTags(c.tags.join(", "));
		setAvatarFileId(c.avatarFileId);
		setBannerFileId(c.bannerFileId);
	}, [community.data]);

	const changeImage = async (kind: "avatar" | "banner") => {
		const asset = await pickImage({
			allowsEditing: true,
			aspect: kind === "avatar" ? [1, 1] : [3, 1],
		});
		if (!asset) return;
		setUploading(kind);
		try {
			const fileId = await uploadImage(
				kind === "avatar" ? "community-avatar" : "community-banner",
				asset,
			);
			if (kind === "avatar") setAvatarFileId(fileId);
			else setBannerFileId(fileId);
		} catch (e) {
			Alert.alert(t("community.admin.uploadErrorTitle"), humanizeError(e));
		} finally {
			setUploading(null);
		}
	};

	const saveSettings = async () => {
		if (name.trim().length === 0) return;
		setSavingSettings(true);
		try {
			await client.community.update({
				communityId,
				name: name.trim(),
				description: description.trim() || null,
				tags: tags
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean),
				avatarFileId,
				bannerFileId,
			});
			qc.invalidateQueries({
				queryKey: orpc.community.byId.key({ input: { communityId } }),
			});
			qc.invalidateQueries({ queryKey: orpc.community.list.key() });
			Alert.alert(
				t("community.admin.savedTitle"),
				t("community.admin.savedBody"),
			);
		} catch (e) {
			Alert.alert(t("community.admin.saveErrorTitle"), humanizeError(e));
		} finally {
			setSavingSettings(false);
		}
	};

	if (session && (myRole.isLoading || community.isLoading)) {
		return (
			<View className="bg-background flex-1">
				<Skeleton className="h-36 w-full rounded-none" />
				<View className="gap-3 p-4">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-12 w-full" />
				</View>
			</View>
		);
	}

	if (!canManage) {
		return (
			<View className="bg-background flex-1 justify-center">
				<EmptyState
					icon={ShieldCheck}
					title={t("community.admin.noPermissionTitle")}
					subtitle={t("community.admin.noPermission")}
				/>
			</View>
		);
	}

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{
				paddingBottom: insets.bottom + 24,
			}}
			keyboardShouldPersistTaps="handled"
		>
			{canEditSettings ? (
				<>
					<PressableScale
						onPress={() => changeImage("banner")}
						accessibilityRole="button"
						accessibilityLabel={t("community.admin.changeBanner")}
					>
						<View className="h-36 w-full">
							{bannerFileId ? (
								<StorageImage
									kind="community-banner"
									fileId={bannerFileId}
									variant="1600"
									style={{ width: "100%", height: "100%" }}
								/>
							) : (
								// Empty banner previews the gradient the live page will show.
								<Gradient style={StyleSheet.absoluteFill} />
							)}
							<View className="absolute inset-0 items-center justify-center">
								<View className="bg-background/70 h-12 w-12 items-center justify-center rounded-full">
									{uploading === "banner" ? (
										<ActivityIndicator color={colors.foreground} />
									) : (
										<Icon as={Camera} size={22} className="text-foreground" />
									)}
								</View>
							</View>
						</View>
					</PressableScale>

					<View className="-mt-10 px-4">
						<PressableScale
							onPress={() => changeImage("avatar")}
							accessibilityRole="button"
							accessibilityLabel={t("community.admin.changeAvatar")}
							style={{ alignSelf: "flex-start" }}
						>
							<GlowAvatar
								fileId={avatarFileId}
								name={name}
								kind="community-avatar"
								size={80}
							/>
							<View className="bg-primary absolute bottom-0 right-0 h-7 w-7 items-center justify-center rounded-full">
								{uploading === "avatar" ? (
									<ActivityIndicator
										size="small"
										color={colors["primary-foreground"]}
									/>
								) : (
									<Icon
										as={Camera}
										size={14}
										className="text-primary-foreground"
									/>
								)}
							</View>
						</PressableScale>
					</View>

					<View className="gap-4 p-4">
						<Text variant="small" className="text-muted-foreground uppercase">
							{t("community.admin.settings")}
						</Text>
						<View className="gap-1.5">
							<Text variant="small" className="text-muted-foreground">
								{t("community.admin.name")}
							</Text>
							<Input
								value={name}
								onChangeText={setName}
								accessibilityLabel={t("community.admin.name")}
							/>
						</View>
						<View className="gap-1.5">
							<Text variant="small" className="text-muted-foreground">
								{t("community.admin.description")}
							</Text>
							<Input
								value={description}
								onChangeText={setDescription}
								multiline
								className="h-24"
								accessibilityLabel={t("community.admin.description")}
							/>
						</View>
						<View className="gap-1.5">
							<Text variant="small" className="text-muted-foreground">
								{t("community.admin.tags")}
							</Text>
							<Input
								value={tags}
								onChangeText={setTags}
								autoCapitalize="none"
								placeholder={t("community.admin.tagsPlaceholder")}
								accessibilityLabel={t("community.admin.tags")}
							/>
						</View>
						<Button
							disabled={name.trim().length === 0 || savingSettings}
							onPress={saveSettings}
							accessibilityRole="button"
							accessibilityLabel={t("community.admin.save")}
						>
							<Text>
								{savingSettings
									? t("community.admin.saving")
									: t("community.admin.save")}
							</Text>
						</Button>
					</View>
				</>
			) : null}

			<Channels communityId={communityId} />
		</ScrollView>
	);
}

function Channels({ communityId }: { communityId: string }) {
	const qc = useQueryClient();
	const { t } = useI18n();
	const channels = useQuery(
		orpc.channel.listByCommunity.queryOptions({ input: { communityId } }),
	);

	const [newName, setNewName] = useState("");
	const [newTopic, setNewTopic] = useState("");
	const [creating, setCreating] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const refresh = () =>
		qc.invalidateQueries({ queryKey: orpc.channel.listByCommunity.key() });

	const createChannel = async () => {
		if (newName.trim().length === 0) return;
		setCreating(true);
		try {
			await client.channel.create({
				communityId,
				name: newName.trim(),
				topic: newTopic.trim() || undefined,
			});
			refresh();
			setNewName("");
			setNewTopic("");
		} catch (e) {
			Alert.alert(
				t("community.admin.createChannelErrorTitle"),
				humanizeError(e),
			);
		} finally {
			setCreating(false);
		}
	};

	const deleteChannel = async (channelId: string, channelName: string) => {
		Alert.alert(
			t("community.admin.deleteChannelTitle"),
			t("community.admin.deleteChannelConfirm", { name: channelName }),
			[
				{ text: t("common.cancel"), style: "cancel" },
				{
					text: t("common.delete"),
					style: "destructive",
					onPress: async () => {
						setDeletingId(channelId);
						try {
							await client.channel.delete({ channelId });
							refresh();
						} catch (e) {
							Alert.alert(
								t("community.admin.deleteChannelErrorTitle"),
								humanizeError(e),
							);
						} finally {
							setDeletingId(null);
						}
					},
				},
			],
		);
	};

	return (
		<View className="gap-3 p-4">
			<Text variant="small" className="text-muted-foreground uppercase">
				{t("community.admin.channels")}
			</Text>

			{channels.isLoading ? (
				<Text variant="muted">{t("community.admin.loadingChannels")}</Text>
			) : channels.data && channels.data.length > 0 ? (
				channels.data.map((ch, i) => (
					<AnimatedEntrance key={ch.id} index={i}>
						<Card className="flex-row items-center gap-3 p-3">
							<Icon as={Hash} size={18} className="text-muted-foreground" />
							<View className="flex-1">
								<Text className="text-foreground font-medium">{ch.name}</Text>
								{ch.topic ? (
									<Text variant="small" className="text-muted-foreground">
										{ch.topic}
									</Text>
								) : null}
							</View>
							<PressableScale
								onPress={() => deleteChannel(ch.id, ch.name)}
								disabled={deletingId === ch.id}
								accessibilityRole="button"
								accessibilityLabel={t("community.admin.deleteChannel", {
									name: ch.name,
								})}
								hitSlop={8}
							>
								{deletingId === ch.id ? (
									<ActivityIndicator size="small" />
								) : (
									<Icon as={Trash2} size={18} className="text-destructive" />
								)}
							</PressableScale>
						</Card>
					</AnimatedEntrance>
				))
			) : (
				<Text variant="muted">{t("community.admin.noChannels")}</Text>
			)}

			<Card className="mt-1 gap-2 p-3">
				<Text variant="small" className="text-muted-foreground">
					{t("community.admin.newChannel")}
				</Text>
				<Input
					value={newName}
					onChangeText={setNewName}
					placeholder={t("community.admin.channelNamePlaceholder")}
					autoCapitalize="none"
					accessibilityLabel={t("community.admin.channelNamePlaceholder")}
				/>
				<Input
					value={newTopic}
					onChangeText={setNewTopic}
					placeholder={t("community.admin.channelTopicPlaceholder")}
					accessibilityLabel={t("community.admin.channelTopicPlaceholder")}
				/>
				<Button
					disabled={newName.trim().length === 0 || creating}
					onPress={createChannel}
					accessibilityRole="button"
					accessibilityLabel={t("community.admin.createChannel")}
				>
					<Text>
						{creating
							? t("community.admin.creatingChannel")
							: t("community.admin.createChannel")}
					</Text>
				</Button>
			</Card>
		</View>
	);
}
