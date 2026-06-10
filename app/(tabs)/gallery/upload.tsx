import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import type { ImagePickerAsset } from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ImagePlus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { pickImage, uploadImage } from "@/lib/upload";

export default function GalleryUpload() {
	const insets = useSafeAreaInsets();
	const qc = useQueryClient();
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
					.map((t) => t.trim())
					.filter(Boolean),
				mimeType: asset.mimeType ?? "image/jpeg",
				fileId,
			});
			qc.invalidateQueries({ queryKey: orpc.gallery.list.key() });
			router.back();
		} catch (e) {
			Alert.alert("Upload failed", humanizeError(e));
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
			<Pressable
				onPress={choose}
				android_ripple={{ color: "rgba(127,127,127,0.18)" }}
				accessibilityRole="button"
				accessibilityLabel="Choose image"
				className="border-border bg-card aspect-square items-center justify-center overflow-hidden rounded-xl border"
			>
				{asset ? (
					<Image
						source={asset.uri}
						style={{ width: "100%", height: "100%" }}
						contentFit="cover"
					/>
				) : (
					<View className="items-center gap-2">
						<Icon as={ImagePlus} size={32} className="text-muted-foreground" />
						<Text variant="muted">Tap to choose an image</Text>
					</View>
				)}
			</Pressable>

			<Input
				placeholder="Title"
				value={name}
				onChangeText={setName}
				accessibilityLabel="Title"
			/>
			<Input
				placeholder="Description (optional)"
				value={longText}
				onChangeText={setLongText}
				multiline
				accessibilityLabel="Description"
				className="h-24"
			/>
			<Input
				placeholder="Tags, comma separated"
				value={tags}
				onChangeText={setTags}
				autoCapitalize="none"
				accessibilityLabel="Tags"
			/>

			<View className="flex-row items-center justify-between">
				<Text className="text-foreground">Mark as NSFW</Text>
				<Toggle
					value={nsfw}
					onValueChange={setNsfw}
					accessibilityLabel="Mark as NSFW"
				/>
			</View>

			<Button
				disabled={!asset || name.trim().length === 0 || busy}
				onPress={submit}
				accessibilityRole="button"
				accessibilityLabel="Post to gallery"
			>
				<Text>{busy ? "Posting…" : "Post to gallery"}</Text>
			</Button>
		</ScrollView>
	);
}
