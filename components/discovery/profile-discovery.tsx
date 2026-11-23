import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame, X } from "@/components/icons";
import { StorageImage } from "@/components/storage-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { orpc } from "@/lib/orpc";
import { Pills } from "./toggle-chips";

type Sona = {
	id: string;
	name: string;
	species: string | null;
	pronouns: string | null;
	description: string | null;
	avatarFileId: string | null;
	refSheetFileId: string | null;
	colors: string[];
};

function RefSheet({ fileId }: { fileId: string }) {
	const { t } = useI18n();
	const insets = useSafeAreaInsets();
	const { width, height } = useWindowDimensions();
	const [open, setOpen] = useState(false);
	return (
		<>
			<Pressable
				onPress={() => setOpen(true)}
				accessibilityRole="imagebutton"
				accessibilityLabel={t("discovery.sonaRefSheet")}
				className="bg-muted overflow-hidden rounded-xl"
			>
				<StorageImage
					kind="gallery"
					fileId={fileId}
					variant="640"
					style={{ width: "100%", height: 160 }}
				/>
			</Pressable>
			<Modal
				visible={open}
				transparent
				animationType="fade"
				onRequestClose={() => setOpen(false)}
				statusBarTranslucent
			>
				<View className="flex-1 bg-black">
					<StorageImage
						kind="gallery"
						fileId={fileId}
						variant="1600"
						contentFit="contain"
						style={{ width, height }}
					/>
					<Pressable
						onPress={() => setOpen(false)}
						accessibilityRole="button"
						accessibilityLabel={t("discovery.close")}
						className="absolute right-4 rounded-full bg-black/60 p-2"
						style={{ top: insets.top + 8 }}
						hitSlop={12}
					>
						<Icon as={X} size={22} className="text-white" />
					</Pressable>
				</View>
			</Modal>
		</>
	);
}

function SonaCard({ s }: { s: Sona }) {
	return (
		<Card className="gap-3 rounded-2xl p-4">
			<View className="flex-row items-center gap-3">
				<View
					className="bg-muted overflow-hidden rounded-2xl"
					style={{ width: 64, height: 64 }}
				>
					{s.avatarFileId ? (
						<StorageImage
							kind="avatar"
							fileId={s.avatarFileId}
							variant="md"
							style={{ width: 64, height: 64 }}
						/>
					) : null}
				</View>
				<View className="flex-1 gap-0.5">
					<Text className="font-display text-lg font-bold">{s.name}</Text>
					{s.species || s.pronouns ? (
						<Text variant="muted" className="text-sm">
							{[s.species, s.pronouns].filter(Boolean).join(" · ")}
						</Text>
					) : null}
					{s.colors.length ? (
						<View className="mt-1 flex-row flex-wrap gap-1.5">
							{s.colors.map((c) => (
								<View
									key={c}
									className="border-border rounded-full border"
									style={{ width: 18, height: 18, backgroundColor: c }}
								/>
							))}
						</View>
					) : null}
				</View>
			</View>
			{s.description ? (
				<Text className="leading-6">{s.description}</Text>
			) : null}
			{s.refSheetFileId ? <RefSheet fileId={s.refSheetFileId} /> : null}
		</Card>
	);
}

/** Looking for, interests, sonas and the 18+ button on a profile's About tab. */
export function ProfileDiscovery({ userId }: { userId: string }) {
	const { t } = useI18n();
	const q = useQuery(orpc.discovery.get.queryOptions({ input: { userId } }));
	const d = q.data;
	if (!d) return null;
	return (
		<View className="gap-4">
			{d.lookingFor.length ? (
				<View className="gap-1.5">
					<Text variant="small" className="text-muted-foreground">
						{t("discovery.lookingForTitle")}
					</Text>
					<Pills
						tone="primary"
						items={d.lookingFor.map((k) => t(`discovery.lookingFor.${k}`))}
					/>
				</View>
			) : null}
			{d.interests.length ? (
				<View className="gap-1.5">
					<Text variant="small" className="text-muted-foreground">
						{t("discovery.interestsTitle")}
					</Text>
					<Pills items={d.interests} />
				</View>
			) : null}
			{d.sonas.length ? (
				<View className="gap-2">
					<Text className="font-display text-xl font-semibold">
						{t("discovery.sonasTitle")}
					</Text>
					{d.sonas.map((s) => (
						<SonaCard key={s.id} s={s} />
					))}
				</View>
			) : null}
			{d.hasAdult ? (
				<Button
					variant="secondary"
					onPress={() =>
						router.push(`/discovery/adult-profile/${userId}` as never)
					}
				>
					<Icon as={Flame} size={16} />
					<Text>{t("discovery.openAdult")}</Text>
				</Button>
			) : null}
		</View>
	);
}
