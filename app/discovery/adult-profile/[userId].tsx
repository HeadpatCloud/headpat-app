import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurredImage } from "@/components/discovery/blurred-image";
import { Pills } from "@/components/discovery/toggle-chips";
import { StorageImage } from "@/components/storage-image";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { orpc } from "@/lib/orpc";

const GAP = 8;

// Someone else's 18+ profile. The API returns null unless both people are
// known adults with NSFW on and nobody blocked the other.
export default function AdultProfileView() {
	const { userId } = useLocalSearchParams<{ userId: string }>();
	const { t } = useI18n();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const tile = Math.floor((width - 32 - GAP * 2) / 3);
	const q = useQuery(
		orpc.discovery.adult.get.queryOptions({ input: { userId } }),
	);
	const a = q.data;

	if (!a) {
		return (
			<View className="bg-background flex-1 p-4">
				<Text variant="muted">
					{q.isPending
						? t("discovery.loading")
						: t("discovery.adultUnavailable")}
				</Text>
			</View>
		);
	}

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{
				padding: 16,
				paddingBottom: insets.bottom + 24,
				gap: 16,
			}}
		>
			<View className="flex-row items-center gap-4">
				<View
					className="bg-muted overflow-hidden rounded-2xl"
					style={{ width: 88, height: 88 }}
				>
					{a.avatarFileId ? (
						<StorageImage
							kind="avatar"
							fileId={a.avatarFileId}
							variant="md"
							style={{ width: 88, height: 88 }}
						/>
					) : null}
				</View>
				<View className="flex-1 gap-1">
					<Text className="font-display text-2xl font-bold">
						{a.displayName ?? ""}
					</Text>
					<Text variant="muted">{t("discovery.adultBadge")}</Text>
				</View>
			</View>
			{a.bio ? <Text>{a.bio}</Text> : null}
			{a.lookingFor.length ? (
				<View className="gap-1.5">
					<Text variant="small" className="text-muted-foreground">
						{t("discovery.lookingForTitle")}
					</Text>
					<Pills
						tone="primary"
						items={a.lookingFor.map((k) => t(`discovery.adultLookingFor.${k}`))}
					/>
				</View>
			) : null}
			{a.into.length ? (
				<View className="gap-1.5">
					<Text variant="small" className="text-muted-foreground">
						{t("discovery.into")}
					</Text>
					<Pills items={a.into} />
				</View>
			) : null}
			{a.photos.length ? (
				<View className="flex-row flex-wrap" style={{ gap: GAP }}>
					{a.photos.map((p) => (
						<BlurredImage
							key={p.id}
							fileId={p.fileId}
							caption={p.caption}
							size={tile}
						/>
					))}
				</View>
			) : null}
		</ScrollView>
	);
}
