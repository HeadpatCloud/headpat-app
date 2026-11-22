import { type Href, router } from "expo-router";
import { memo } from "react";
import { Pressable, View } from "react-native";
import {
	Calendar,
	HeartHandshake,
	LayoutPanelLeft,
	type LucideIcon,
	MapIcon,
} from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";

type Tile = {
	href: Href;
	icon: LucideIcon;
	title: string;
	text: string;
	tint: string;
};

// The website's four shortcut tiles, two per row on a phone.
export const HomeTiles = memo(function HomeTiles() {
	const { t } = useI18n();
	const tiles: Tile[] = [
		{
			href: "/gallery",
			icon: LayoutPanelLeft,
			title: t("tabs.gallery"),
			text: t("home.tileGallery"),
			tint: "bg-primary/10",
		},
		{
			href: "/community",
			icon: HeartHandshake,
			title: t("home.communitiesTitle"),
			text: t("home.tileCommunities"),
			tint: "bg-accent/20",
		},
		{
			href: "/events",
			icon: Calendar,
			title: t("tabs.events"),
			text: t("home.tileEvents"),
			tint: "bg-muted",
		},
		{
			href: "/locations",
			icon: MapIcon,
			title: t("home.mapTitle"),
			text: t("home.tileMap"),
			tint: "bg-destructive/10",
		},
	];
	return (
		<View className="flex-row flex-wrap" style={{ margin: -8 }}>
			{tiles.map((tile) => (
				<View key={tile.title} style={{ width: "50%", padding: 8 }}>
					<Pressable
						onPress={() => router.push(tile.href)}
						accessibilityRole="button"
						accessibilityLabel={tile.title}
						className={`active:opacity-80 gap-3 rounded-3xl p-5 ${tile.tint}`}
					>
						<View className="bg-card h-11 w-11 items-center justify-center rounded-2xl">
							<Icon as={tile.icon} size={22} className="text-link" />
						</View>
						<Text className="font-display text-xl font-semibold">
							{tile.title}
						</Text>
						<Text className="text-muted-foreground text-sm font-semibold">
							{tile.text}
						</Text>
					</Pressable>
				</View>
			))}
		</View>
	);
});
