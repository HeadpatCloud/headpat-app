import type { AdultLookingFor } from "@backend/lib/discovery";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Alert, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurredImage } from "@/components/discovery/blurred-image";
import { ImagePick } from "@/components/discovery/image-pick";
import { TagInput } from "@/components/discovery/tag-input";
import { ToggleChips } from "@/components/discovery/toggle-chips";
import { Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { Text } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { useBlurAdult, useSetBlurAdult } from "@/lib/blur-adult";
import { useDiscoveryOptions } from "@/lib/discovery-options";
import { useI18n } from "@/lib/i18n/provider";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { pickImage, uploadImage } from "@/lib/upload";

const GAP = 8;

// The separate 18+ profile. The API only allows it for known adults with NSFW
// on; this screen is only linked for them too.
export default function AdultProfileScreen() {
	const { t } = useI18n();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const tile = Math.floor((width - 32 - GAP * 2) / 3);
	const qc = useQueryClient();
	const mine = useQuery(orpc.discovery.adult.mine.queryOptions({ input: {} }));
	const options = useDiscoveryOptions();
	const [enabled, setEnabled] = useState(false);
	const [displayName, setDisplayName] = useState("");
	const [avatarFileId, setAvatarFileId] = useState<string | null>(null);
	const [bio, setBio] = useState("");
	const [into, setInto] = useState<string[]>([]);
	const [lookingFor, setLookingFor] = useState<AdultLookingFor[]>([]);
	const [busy, setBusy] = useState(false);
	const [uploading, setUploading] = useState(false);
	const blurAdult = useBlurAdult();
	const setBlurAdult = useSetBlurAdult();

	useEffect(() => {
		const a = mine.data;
		if (!a) return;
		setEnabled(a.enabled);
		setDisplayName(a.displayName ?? "");
		setAvatarFileId(a.avatarFileId);
		setBio(a.bio ?? "");
		setInto(a.into);
		setLookingFor(a.lookingFor);
	}, [mine.data]);

	const refresh = () =>
		qc.invalidateQueries({ queryKey: orpc.discovery.key() });
	const fail = (e: unknown) =>
		Alert.alert(t("locations.errorTitle"), humanizeError(e));

	const save = async () => {
		setBusy(true);
		try {
			await client.discovery.adult.save({
				enabled,
				displayName: displayName.trim() || null,
				avatarFileId,
				bio: bio.trim() || null,
				into,
				lookingFor,
			});
			await refresh();
		} catch (e) {
			fail(e);
		} finally {
			setBusy(false);
		}
	};

	const addPhoto = async () => {
		const asset = await pickImage();
		if (!asset) return;
		setUploading(true);
		try {
			const fileId = await uploadImage("gallery", asset);
			await client.discovery.adult.addPhoto({ fileId });
			await refresh();
		} catch (e) {
			fail(e);
		} finally {
			setUploading(false);
		}
	};

	const remove = () =>
		Alert.alert(t("discovery.adultDelete"), t("discovery.adultDeleteConfirm"), [
			{ text: t("discovery.cancel"), style: "cancel" },
			{
				text: t("discovery.adultDelete"),
				style: "destructive",
				onPress: async () => {
					await client.discovery.adult.delete({}).catch(fail);
					await refresh();
				},
			},
		]);

	if (mine.isError) {
		return (
			<View className="bg-background flex-1 p-4">
				<Text variant="muted">{t("discovery.adultNotAllowed")}</Text>
			</View>
		);
	}

	const photos = mine.data?.photos ?? [];
	const maxPhotos = options.maxAdultPhotos;

	return (
		<KeyboardAwareScrollView
			className="bg-background flex-1"
			contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
		>
			<View className="gap-5">
				<Card className="rounded-2xl p-4">
					<Text variant="muted" className="text-sm">
						{t("discovery.adultIntro")}
					</Text>
				</Card>
				<View className="min-h-11 flex-row items-center justify-between gap-3">
					<View className="flex-1">
						<Text className="text-foreground">{t("discovery.blurAdult")}</Text>
						<Text variant="muted" className="text-sm">
							{t("discovery.blurAdultHint")}
						</Text>
					</View>
					<Toggle
						value={blurAdult}
						onValueChange={setBlurAdult}
						accessibilityLabel={t("discovery.blurAdult")}
					/>
				</View>
				<View className="min-h-11 flex-row items-center justify-between">
					<Text className="text-foreground flex-1">
						{t("discovery.adultEnabled")}
					</Text>
					<Toggle
						value={enabled}
						onValueChange={setEnabled}
						accessibilityLabel={t("discovery.adultEnabled")}
					/>
				</View>
				<View className="gap-1.5">
					<Text variant="small" className="text-muted-foreground">
						{t("discovery.adultName")}
					</Text>
					<Input
						value={displayName}
						maxLength={80}
						placeholder={t("discovery.adultNameHint")}
						onChangeText={setDisplayName}
					/>
				</View>
				<ImagePick
					kind="avatar"
					square
					label={t("discovery.adultPicture")}
					fileId={avatarFileId}
					onChange={setAvatarFileId}
				/>
				<View className="gap-1.5">
					<Text variant="small" className="text-muted-foreground">
						{t("discovery.adultBio")}
					</Text>
					<Input
						value={bio}
						maxLength={4000}
						multiline
						className="min-h-28 py-3"
						textAlignVertical="top"
						onChangeText={setBio}
					/>
				</View>
				<View className="gap-2">
					<Text className="font-semibold">{t("discovery.into")}</Text>
					<TagInput
						kind="into"
						value={into}
						onChange={setInto}
						max={options.maxInto}
						placeholder={t("discovery.intoPlaceholder")}
						label={t("discovery.into")}
					/>
				</View>
				<View className="gap-2">
					<Text className="font-semibold">
						{t("discovery.lookingForTitle")}
					</Text>
					<ToggleChips
						options={options.adultLookingFor}
						value={lookingFor}
						onChange={setLookingFor}
						label={(k) => t(`discovery.adultLookingFor.${k}`)}
					/>
				</View>
				<Button
					fullWidth
					loading={busy}
					disabled={busy || mine.isPending}
					onPress={save}
				>
					<Text>{t("discovery.save")}</Text>
				</Button>

				<View className="border-border gap-3 border-t pt-5">
					<Text className="font-semibold">{t("discovery.adultPhotos")}</Text>
					<Text variant="muted" className="text-sm">
						{t("discovery.adultPhotosHint")}
					</Text>
					{mine.data ? (
						<>
							<View className="flex-row flex-wrap" style={{ gap: GAP }}>
								{photos.map((p) => (
									<View key={p.id}>
										<BlurredImage
											fileId={p.fileId}
											caption={p.caption}
											size={tile}
										/>
										<Button
											size="icon"
											variant="secondary"
											className="absolute right-1 top-1 h-9 w-9"
											accessibilityLabel={t("discovery.removePhoto")}
											onPress={async () => {
												await client.discovery.adult
													.removePhoto({ id: p.id })
													.catch(fail);
												await refresh();
											}}
										>
											<Icon as={Trash2} size={14} />
										</Button>
									</View>
								))}
							</View>
							<Button
								variant="secondary"
								loading={uploading}
								disabled={uploading || photos.length >= maxPhotos}
								onPress={addPhoto}
							>
								<Icon as={Plus} size={16} />
								<Text>{t("discovery.addPhoto")}</Text>
							</Button>
						</>
					) : (
						<Text variant="muted">{t("discovery.adultSaveFirst")}</Text>
					)}
				</View>

				{mine.data ? (
					<Button variant="ghost" onPress={remove}>
						<Text className="text-destructive">
							{t("discovery.adultDelete")}
						</Text>
					</Button>
				) : null}
			</View>
		</KeyboardAwareScrollView>
	);
}
