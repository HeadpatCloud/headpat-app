import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Camera } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StorageImage } from "@/components/storage-image";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
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
	const qc = useQueryClient();
	const { data: me, isLoading } = useQuery(
		orpc.profile.me.queryOptions({ input: {} }),
	);

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
			Alert.alert("Upload failed", humanizeError(e));
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
			await qc.invalidateQueries({ queryKey: orpc.profile.me.key() });
			router.back();
		} catch (e) {
			Alert.alert("Couldn't save", humanizeError(e));
		} finally {
			setBusy(false);
		}
	};

	if (isLoading) {
		return (
			<View className="bg-background flex-1 p-4">
				<Text variant="muted">Loading…</Text>
			</View>
		);
	}

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
			keyboardShouldPersistTaps="handled"
		>
			<Pressable
				onPress={() => changeImage("banner")}
				accessibilityRole="button"
				accessibilityLabel="Change banner"
				className="bg-muted h-36 w-full items-center justify-center"
			>
				{bannerFileId ? (
					<StorageImage
						kind="banner"
						fileId={bannerFileId}
						style={{ width: "100%", height: "100%" }}
					/>
				) : null}
				<View className="absolute inset-0 items-center justify-center">
					{uploading === "banner" ? (
						<ActivityIndicator />
					) : (
						<Icon as={Camera} size={24} className="text-foreground/70" />
					)}
				</View>
			</Pressable>

			<View className="-mt-10 px-4">
				<Pressable
					onPress={() => changeImage("avatar")}
					accessibilityRole="button"
					accessibilityLabel="Change avatar"
					className="border-background self-start rounded-full border-4"
				>
					<Avatar fileId={avatarFileId} name={form.displayName} size={80} />
					<View className="bg-primary absolute bottom-0 right-0 h-7 w-7 items-center justify-center rounded-full">
						{uploading === "avatar" ? (
							<ActivityIndicator size="small" color="#fff" />
						) : (
							<Icon as={Camera} size={14} className="text-primary-foreground" />
						)}
					</View>
				</Pressable>
			</View>

			<View className="gap-4 p-4">
				<Field label="Display name">
					<Input
						value={form.displayName}
						onChangeText={(v) => set("displayName", v)}
						accessibilityLabel="Display name"
					/>
				</Field>
				<Field label="Bio">
					<Input
						value={form.bio}
						onChangeText={(v) => set("bio", v)}
						multiline
						className="h-24"
						accessibilityLabel="Bio"
					/>
				</Field>
				<Field label="Pronouns">
					<Input
						value={form.pronouns}
						onChangeText={(v) => set("pronouns", v)}
						accessibilityLabel="Pronouns"
					/>
				</Field>
				<Field label="Location">
					<Input
						value={form.location}
						onChangeText={(v) => set("location", v)}
						accessibilityLabel="Location"
					/>
				</Field>

				<Text variant="small" className="text-muted-foreground pt-2 uppercase">
					Social handles
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

				<View className="flex-row items-center justify-between pt-2">
					<Text className="text-foreground flex-1">
						Show my profile in search
					</Text>
					<Toggle
						value={indexing}
						onValueChange={setIndexing}
						accessibilityLabel="Show in search"
					/>
				</View>
				<View className="flex-row items-center justify-between">
					<Text className="text-foreground flex-1">Show NSFW content</Text>
					<Toggle
						value={nsfw}
						onValueChange={setNsfw}
						accessibilityLabel="Show NSFW content"
					/>
				</View>

				<Button
					disabled={busy}
					onPress={save}
					accessibilityRole="button"
					accessibilityLabel="Save profile"
					className="mt-2"
				>
					<Text>{busy ? "Saving…" : "Save"}</Text>
				</Button>
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
