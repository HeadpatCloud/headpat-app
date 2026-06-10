import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

export default function NewCommunity() {
	const insets = useSafeAreaInsets();
	const qc = useQueryClient();
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [tags, setTags] = useState("");
	const [isFindable, setIsFindable] = useState(true);
	const [hasPublicPage, setHasPublicPage] = useState(true);
	const [nsfw, setNsfw] = useState(false);
	const [busy, setBusy] = useState(false);

	const submit = async () => {
		if (name.trim().length === 0) return;
		setBusy(true);
		try {
			const tagList = tags
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);
			const created = await client.community.create({
				name: name.trim(),
				description: description.trim() || undefined,
				tags: tagList.length > 0 ? tagList : undefined,
				settings: { isFindable, hasPublicPage, nsfw },
			});
			qc.invalidateQueries({ queryKey: orpc.community.list.key() });
			router.replace(`/community/${created.id}`);
		} catch (e) {
			Alert.alert("Couldn't create community", humanizeError(e));
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
			<View className="gap-1.5">
				<Text variant="small" className="text-muted-foreground">
					Name
				</Text>
				<Input
					placeholder="Community name"
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
					placeholder="What's this community about? (optional)"
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
					placeholder="Tags, comma separated"
					value={tags}
					onChangeText={setTags}
					autoCapitalize="none"
					accessibilityLabel="Tags"
				/>
			</View>

			<Text variant="small" className="text-muted-foreground pt-2 uppercase">
				Settings
			</Text>

			<View className="flex-row items-center justify-between">
				<Text className="text-foreground flex-1">Findable in search</Text>
				<Toggle
					value={isFindable}
					onValueChange={setIsFindable}
					accessibilityLabel="Findable in search"
				/>
			</View>
			<View className="flex-row items-center justify-between">
				<Text className="text-foreground flex-1">Has a public page</Text>
				<Toggle
					value={hasPublicPage}
					onValueChange={setHasPublicPage}
					accessibilityLabel="Has a public page"
				/>
			</View>
			<View className="flex-row items-center justify-between">
				<Text className="text-foreground flex-1">NSFW community</Text>
				<Toggle
					value={nsfw}
					onValueChange={setNsfw}
					accessibilityLabel="NSFW community"
				/>
			</View>

			<Button
				disabled={name.trim().length === 0 || busy}
				onPress={submit}
				accessibilityRole="button"
				accessibilityLabel="Create community"
				className="mt-2"
			>
				<Text>{busy ? "Creating…" : "Create community"}</Text>
			</Button>
		</ScrollView>
	);
}
