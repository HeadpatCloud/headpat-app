import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Camera, Hash, Trash2 } from "lucide-react-native";
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
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { pickImage, uploadImage } from "@/lib/upload";

export default function CommunityAdmin() {
	const { communityId } = useLocalSearchParams<{ communityId: string }>();
	const insets = useSafeAreaInsets();
	const qc = useQueryClient();

	const myRole = useQuery(
		orpc.community.myRoleIn.queryOptions({ input: { communityId } }),
	);
	const community = useQuery(
		orpc.community.byId.queryOptions({ input: { communityId } }),
	);

	const role = myRole.data?.role;
	const canManage =
		role === "admin" || role === "moderator" || role === "owner";
	const canEditSettings = role === "admin" || role === "owner";

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
			Alert.alert("Upload failed", humanizeError(e));
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
			await qc.invalidateQueries({ queryKey: orpc.community.byId.key() });
			await qc.invalidateQueries({ queryKey: orpc.community.list.key() });
			Alert.alert("Saved", "Community settings updated.");
		} catch (e) {
			Alert.alert("Couldn't save", humanizeError(e));
		} finally {
			setSavingSettings(false);
		}
	};

	if (myRole.isLoading || community.isLoading) {
		return (
			<View className="bg-background flex-1 p-4">
				<Text variant="muted">Loading…</Text>
			</View>
		);
	}

	if (!canManage) {
		return (
			<View className="bg-background flex-1 items-center justify-center p-6">
				<Text variant="muted" className="text-center">
					You don't have permission to manage this community.
				</Text>
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
					<Pressable
						onPress={() => changeImage("banner")}
						accessibilityRole="button"
						accessibilityLabel="Change banner"
						className="bg-muted h-36 w-full items-center justify-center"
					>
						{bannerFileId ? (
							<StorageImage
								kind="community-banner"
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
							<Avatar
								fileId={avatarFileId}
								name={name}
								kind="community-avatar"
								size={80}
							/>
							<View className="bg-primary absolute bottom-0 right-0 h-7 w-7 items-center justify-center rounded-full">
								{uploading === "avatar" ? (
									<ActivityIndicator size="small" color="#fff" />
								) : (
									<Icon
										as={Camera}
										size={14}
										className="text-primary-foreground"
									/>
								)}
							</View>
						</Pressable>
					</View>

					<View className="gap-4 p-4">
						<Text variant="small" className="text-muted-foreground uppercase">
							Settings
						</Text>
						<View className="gap-1.5">
							<Text variant="small" className="text-muted-foreground">
								Name
							</Text>
							<Input
								value={name}
								onChangeText={setName}
								accessibilityLabel="Community name"
							/>
						</View>
						<View className="gap-1.5">
							<Text variant="small" className="text-muted-foreground">
								Description
							</Text>
							<Input
								value={description}
								onChangeText={setDescription}
								multiline
								className="h-24"
								accessibilityLabel="Description"
							/>
						</View>
						<View className="gap-1.5">
							<Text variant="small" className="text-muted-foreground">
								Tags
							</Text>
							<Input
								value={tags}
								onChangeText={setTags}
								autoCapitalize="none"
								placeholder="Tags, comma separated"
								accessibilityLabel="Tags"
							/>
						</View>
						<Button
							disabled={name.trim().length === 0 || savingSettings}
							onPress={saveSettings}
							accessibilityRole="button"
							accessibilityLabel="Save settings"
						>
							<Text>{savingSettings ? "Saving…" : "Save settings"}</Text>
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
			await refresh();
			setNewName("");
			setNewTopic("");
		} catch (e) {
			Alert.alert("Couldn't create channel", humanizeError(e));
		} finally {
			setCreating(false);
		}
	};

	const deleteChannel = async (channelId: string, channelName: string) => {
		Alert.alert("Delete channel", `Delete #${channelName}?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					setDeletingId(channelId);
					try {
						await client.channel.delete({ channelId });
						await refresh();
					} catch (e) {
						Alert.alert("Couldn't delete channel", humanizeError(e));
					} finally {
						setDeletingId(null);
					}
				},
			},
		]);
	};

	return (
		<View className="gap-3 p-4">
			<Text variant="small" className="text-muted-foreground uppercase">
				Channels
			</Text>

			{channels.isLoading ? (
				<Text variant="muted">Loading channels…</Text>
			) : channels.data && channels.data.length > 0 ? (
				channels.data.map((ch) => (
					<View
						key={ch.id}
						className="border-border bg-card flex-row items-center gap-3 rounded-lg border p-3"
					>
						<Icon as={Hash} size={18} className="text-muted-foreground" />
						<View className="flex-1">
							<Text className="text-foreground font-medium">{ch.name}</Text>
							{ch.topic ? (
								<Text variant="small" className="text-muted-foreground">
									{ch.topic}
								</Text>
							) : null}
						</View>
						<Pressable
							onPress={() => deleteChannel(ch.id, ch.name)}
							disabled={deletingId === ch.id}
							accessibilityRole="button"
							accessibilityLabel={`Delete channel ${ch.name}`}
							hitSlop={8}
						>
							{deletingId === ch.id ? (
								<ActivityIndicator size="small" />
							) : (
								<Icon as={Trash2} size={18} className="text-destructive" />
							)}
						</Pressable>
					</View>
				))
			) : (
				<Text variant="muted">No channels yet.</Text>
			)}

			<View className="border-border bg-card mt-1 gap-2 rounded-lg border p-3">
				<Text variant="small" className="text-muted-foreground">
					New channel
				</Text>
				<Input
					value={newName}
					onChangeText={setNewName}
					placeholder="Channel name"
					autoCapitalize="none"
					accessibilityLabel="New channel name"
				/>
				<Input
					value={newTopic}
					onChangeText={setNewTopic}
					placeholder="Topic (optional)"
					accessibilityLabel="New channel topic"
				/>
				<Button
					disabled={newName.trim().length === 0 || creating}
					onPress={createChannel}
					accessibilityRole="button"
					accessibilityLabel="Create channel"
				>
					<Text>{creating ? "Creating…" : "Create channel"}</Text>
				</Button>
			</View>
		</View>
	);
}
