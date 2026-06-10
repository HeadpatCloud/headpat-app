import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import type { ImagePickerAsset } from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ImagePlus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { pickImage, uploadImage } from "@/lib/upload";

export default function GalleryUpload() {
	const insets = useSafeAreaInsets();
	const qc = useQueryClient();
	const { t } = useI18n();
	const [asset, setAsset] = useState<ImagePickerAsset | null>(null);
	const [name, setName] = useState("");
	const [longText, setLongText] = useState("");
	const [tags, setTags] = useState("");
	const [nsfw, setNsfw] = useState(false);
	const [busy, setBusy] = useState(false);

	const choose = async () => {
		const picked = await pickImage();
		if (picked) setAsset(picked);
	};

	const submit = async () => {
		if (!asset || name.trim().length === 0) return;
		setBusy(true);
		try {
			const fileId = await uploadImage("gallery", asset);
			await client.gallery.create({
				name: name.trim(),
				longText: longText.trim() || undefined,
				nsfw,
				tags: tags
					.split(",")
					.map((tag) => tag.trim())
					.filter(Boolean),
				mimeType: asset.mimeType ?? "image/jpeg",
				fileId,
			});
			qc.invalidateQueries({ queryKey: orpc.gallery.list.key() });
			if (Platform.OS !== "web")
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			router.back();
		} catch (e) {
			Alert.alert(t("gallery.upload.failed"), humanizeError(e));
		} finally {
			setBusy(false);
		}
	};

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{
				padding: 16,
				paddingBottom: insets.bottom + 24,
				gap: 16,
			}}
			keyboardShouldPersistTaps="handled"
		>
			<AnimatedEntrance index={0}>
				<PressableScale
					scaleTo={0.98}
					onPress={choose}
					disabled={busy}
					android_ripple={{ color: "rgba(127,127,127,0.18)" }}
					accessibilityRole="button"
					accessibilityLabel={t("gallery.upload.chooseImageA11y")}
					className="overflow-hidden rounded-3xl"
				>
					{asset ? (
						<View className="border-border aspect-square overflow-hidden rounded-3xl border">
							<AnimatedEntrance
								key={asset.uri}
								preset="fade"
								style={{ width: "100%", height: "100%" }}
							>
								<Image
									source={asset.uri}
									style={{ width: "100%", height: "100%" }}
									contentFit="cover"
								/>
							</AnimatedEntrance>
						</View>
					) : (
						<View className="border-border bg-card aspect-square items-center justify-center rounded-3xl border-2 border-dashed">
							<View className="items-center gap-3">
								<View className="h-16 w-16 items-center justify-center overflow-hidden rounded-full">
									<Gradient opacity={0.18} style={StyleSheet.absoluteFill} />
									<Icon as={ImagePlus} size={28} className="text-primary" />
								</View>
								<Text variant="muted">{t("gallery.upload.chooseImage")}</Text>
							</View>
						</View>
					)}
				</PressableScale>
			</AnimatedEntrance>

			{asset ? (
				<Gradient
					borderRadius={999}
					opacity={0.8}
					style={{ height: 3, width: "100%" }}
					pointerEvents="none"
				/>
			) : null}

			<AnimatedEntrance index={1} className="gap-4">
				<Input
					placeholder={t("gallery.upload.titlePlaceholder")}
					value={name}
					onChangeText={setName}
					editable={!busy}
					accessibilityLabel={t("gallery.upload.titlePlaceholder")}
				/>
				<Input
					placeholder={t("gallery.upload.descriptionPlaceholder")}
					value={longText}
					onChangeText={setLongText}
					multiline
					editable={!busy}
					accessibilityLabel={t("gallery.upload.descriptionPlaceholder")}
					className="h-24"
				/>
				<Input
					placeholder={t("gallery.upload.tagsPlaceholder")}
					value={tags}
					onChangeText={setTags}
					autoCapitalize="none"
					editable={!busy}
					accessibilityLabel={t("gallery.upload.tagsPlaceholder")}
				/>
			</AnimatedEntrance>

			<AnimatedEntrance index={2}>
				<View className="flex-row items-center justify-between">
					<Text className="text-foreground">
						{t("gallery.upload.nsfwLabel")}
					</Text>
					<Toggle
						value={nsfw}
						onValueChange={(v) => {
							if (!busy) setNsfw(v);
						}}
						accessibilityLabel={t("gallery.upload.nsfwLabel")}
					/>
				</View>
			</AnimatedEntrance>

			<AnimatedEntrance index={3}>
				<Button
					size="lg"
					fullWidth
					loading={busy}
					disabled={!asset || name.trim().length === 0}
					onPress={submit}
					accessibilityRole="button"
					accessibilityLabel={t("gallery.upload.post")}
				>
					<Text>{t("gallery.upload.post")}</Text>
				</Button>
			</AnimatedEntrance>
		</ScrollView>
	);
}
