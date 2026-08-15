import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StorageImage } from "@/components/storage-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

export default function EditGalleryPost() {
	const { galleryId } = useLocalSearchParams<{ galleryId: string }>();
	const insets = useSafeAreaInsets();
	const qc = useQueryClient();
	const { t } = useI18n();

	const { data, isLoading } = useQuery(
		orpc.gallery.byId.queryOptions({ input: { itemId: galleryId } }),
	);

	const [name, setName] = useState("");
	const [longText, setLongText] = useState("");
	const [tags, setTags] = useState("");
	const [nsfw, setNsfw] = useState(false);
	const [busy, setBusy] = useState(false);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		if (!data || loaded) return;
		setName(data.name);
		setLongText(data.longText ?? "");
		setTags(data.tags.join(", "));
		setNsfw(data.nsfw);
		setLoaded(true);
	}, [data, loaded]);

	const submit = async () => {
		if (name.trim().length === 0 || busy) return;
		setBusy(true);
		try {
			await client.gallery.update({
				itemId: galleryId,
				name: name.trim(),
				longText: longText.trim() || null,
				nsfw,
				tags: tags
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean),
			});
			qc.invalidateQueries({
				queryKey: orpc.gallery.byId.key({ input: { itemId: galleryId } }),
			});
			qc.invalidateQueries({ queryKey: orpc.gallery.list.key() });
			qc.invalidateQueries({ queryKey: ["db", "gallery", "recent"] });
			router.back();
		} catch (e) {
			Alert.alert(t("gallery.saveFailed"), humanizeError(e));
		} finally {
			setBusy(false);
		}
	};

	if (isLoading || !loaded) {
		return (
			<View className="bg-background flex-1 gap-3 p-4">
				<Skeleton className="h-40 w-full rounded-xl" />
				<Skeleton className="h-12 w-full rounded-xl" />
				<Skeleton className="h-24 w-full rounded-xl" />
			</View>
		);
	}

	return (
		<KeyboardAwareScrollView
			className="bg-background flex-1"
			contentContainerStyle={{
				padding: 16,
				paddingBottom: insets.bottom + 24,
				gap: 16,
			}}
			keyboardShouldPersistTaps="handled"
		>
			<AnimatedEntrance index={0}>
				<StorageImage
					kind="gallery"
					fileId={data?.fileId}
					variant="640"
					blurhash={data?.blurHash}
					style={{ height: 160, width: "100%", borderRadius: 12 }}
					accessibilityLabel={name}
				/>
			</AnimatedEntrance>

			<AnimatedEntrance index={1} className="gap-1.5">
				<Text variant="caption">{t("gallery.upload.titlePlaceholder")}</Text>
				<Input
					placeholder={t("gallery.upload.titlePlaceholder")}
					value={name}
					onChangeText={setName}
					accessibilityLabel={t("gallery.upload.titlePlaceholder")}
				/>
			</AnimatedEntrance>

			<AnimatedEntrance index={2} className="gap-1.5">
				<Text variant="caption">
					{t("gallery.upload.descriptionPlaceholder")}
				</Text>
				<Input
					placeholder={t("gallery.upload.descriptionPlaceholder")}
					value={longText}
					onChangeText={setLongText}
					multiline
					className="h-24"
					accessibilityLabel={t("gallery.upload.descriptionPlaceholder")}
				/>
			</AnimatedEntrance>

			<AnimatedEntrance index={3} className="gap-1.5">
				<Text variant="caption">{t("gallery.upload.tagsPlaceholder")}</Text>
				<Input
					placeholder={t("gallery.upload.tagsPlaceholder")}
					value={tags}
					onChangeText={setTags}
					autoCapitalize="none"
					accessibilityLabel={t("gallery.upload.tagsPlaceholder")}
				/>
			</AnimatedEntrance>

			<AnimatedEntrance index={4}>
				<View className="flex-row items-center justify-between pt-1">
					<Text className="text-foreground flex-1">
						{t("gallery.upload.nsfwLabel")}
					</Text>
					<Toggle
						value={nsfw}
						onValueChange={setNsfw}
						accessibilityLabel={t("gallery.upload.nsfwLabel")}
					/>
				</View>
			</AnimatedEntrance>

			<AnimatedEntrance index={5}>
				<Button
					fullWidth
					disabled={name.trim().length === 0 || busy}
					loading={busy}
					onPress={submit}
					accessibilityRole="button"
					accessibilityLabel={t("common.save")}
					className="mt-2"
				>
					<Text>{t("common.save")}</Text>
				</Button>
			</AnimatedEntrance>
		</KeyboardAwareScrollView>
	);
}
