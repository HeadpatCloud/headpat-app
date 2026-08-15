import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Gradient } from "@/components/ui/gradient";
import { Input } from "@/components/ui/input";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { Text } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { useTheme } from "@/lib/theme/provider";

export default function NewCommunity() {
	const insets = useSafeAreaInsets();
	const qc = useQueryClient();
	const { t } = useI18n();
	const { colors } = useTheme();
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
			Alert.alert(t("community.new.errorTitle"), humanizeError(e));
		} finally {
			setBusy(false);
		}
	};

	return (
		<KeyboardAwareScrollView
			className="bg-background flex-1"
			contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
			keyboardShouldPersistTaps="handled"
		>
			{/* Live preview strip: shows the community name as it's typed. */}
			<Gradient
				style={{
					height: 112,
					justifyContent: "flex-end",
					paddingHorizontal: 16,
					paddingBottom: 12,
				}}
			>
				<Text
					variant="display"
					numberOfLines={1}
					style={{ color: colors["primary-foreground"] }}
				>
					{name.trim() || t("titles.communityNew")}
				</Text>
			</Gradient>

			<View className="gap-4 p-4">
				<AnimatedEntrance index={0} className="gap-1.5">
					<Text variant="small" className="text-muted-foreground">
						{t("community.new.name")}
					</Text>
					<Input
						placeholder={t("community.new.namePlaceholder")}
						value={name}
						onChangeText={setName}
						accessibilityLabel={t("community.new.namePlaceholder")}
					/>
				</AnimatedEntrance>

				<AnimatedEntrance index={1} className="gap-1.5">
					<Text variant="small" className="text-muted-foreground">
						{t("community.new.description")}
					</Text>
					<Input
						placeholder={t("community.new.descriptionPlaceholder")}
						value={description}
						onChangeText={setDescription}
						multiline
						className="h-24"
						accessibilityLabel={t("community.new.description")}
					/>
				</AnimatedEntrance>

				<AnimatedEntrance index={2} className="gap-1.5">
					<Text variant="small" className="text-muted-foreground">
						{t("community.new.tags")}
					</Text>
					<Input
						placeholder={t("community.new.tagsPlaceholder")}
						value={tags}
						onChangeText={setTags}
						autoCapitalize="none"
						accessibilityLabel={t("community.new.tags")}
					/>
				</AnimatedEntrance>

				<AnimatedEntrance index={3} className="gap-4">
					<Text
						variant="small"
						className="text-muted-foreground pt-2 uppercase"
					>
						{t("community.new.settings")}
					</Text>
					<View className="flex-row items-center justify-between">
						<Text className="text-foreground flex-1">
							{t("community.new.findable")}
						</Text>
						<Toggle
							value={isFindable}
							onValueChange={setIsFindable}
							accessibilityLabel={t("community.new.findable")}
						/>
					</View>
					<View className="flex-row items-center justify-between">
						<Text className="text-foreground flex-1">
							{t("community.new.publicPage")}
						</Text>
						<Toggle
							value={hasPublicPage}
							onValueChange={setHasPublicPage}
							accessibilityLabel={t("community.new.publicPage")}
						/>
					</View>
					<View className="flex-row items-center justify-between">
						<Text className="text-foreground flex-1">
							{t("community.new.nsfw")}
						</Text>
						<Toggle
							value={nsfw}
							onValueChange={setNsfw}
							accessibilityLabel={t("community.new.nsfw")}
						/>
					</View>
				</AnimatedEntrance>

				<AnimatedEntrance index={4}>
					<Button
						disabled={name.trim().length === 0 || busy}
						onPress={submit}
						accessibilityRole="button"
						accessibilityLabel={t("community.new.create")}
						className="mt-2"
					>
						<Text>
							{busy ? t("community.new.creating") : t("community.new.create")}
						</Text>
					</Button>
				</AnimatedEntrance>
			</View>
		</KeyboardAwareScrollView>
	);
}
