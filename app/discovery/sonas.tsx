import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "@/components/icons";
import { StorageImage } from "@/components/storage-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useDiscoveryOptions } from "@/lib/discovery-options";
import { useI18n } from "@/lib/i18n/provider";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

export default function SonasScreen() {
	const { t } = useI18n();
	const insets = useSafeAreaInsets();
	const qc = useQueryClient();
	const mine = useQuery(orpc.discovery.mine.queryOptions({ input: {} }));
	const options = useDiscoveryOptions();
	const sonas = mine.data?.sonas ?? [];
	const max = options.maxSonas;
	const refresh = () =>
		qc.invalidateQueries({ queryKey: orpc.discovery.key() });

	const move = async (index: number, by: -1 | 1) => {
		const ids = sonas.map((s) => s.id);
		const j = index + by;
		if (j < 0 || j >= ids.length) return;
		[ids[index], ids[j]] = [ids[j], ids[index]];
		try {
			await client.discovery.sonas.reorder({ ids });
			await refresh();
		} catch (e) {
			Alert.alert(t("locations.errorTitle"), humanizeError(e));
		}
	};

	const remove = (id: string, name: string) =>
		Alert.alert(
			t("discovery.deleteSona"),
			t("discovery.deleteSonaConfirm", { name }),
			[
				{ text: t("discovery.cancel"), style: "cancel" },
				{
					text: t("discovery.deleteSona"),
					style: "destructive",
					onPress: async () => {
						await client.discovery.sonas.delete({ id }).catch(() => {});
						await refresh();
					},
				},
			],
		);

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{
				padding: 16,
				paddingBottom: insets.bottom + 24,
				gap: 12,
			}}
		>
			<Text variant="muted">{t("discovery.sonasDescription")}</Text>
			{mine.isError ? (
				<Text className="text-destructive text-sm">
					{t("discovery.unavailable")}
				</Text>
			) : null}
			{sonas.length === 0 && mine.isSuccess ? (
				<Text variant="muted">{t("discovery.noSonas")}</Text>
			) : null}
			{sonas.map((s, i) => (
				<Card
					key={s.id}
					className="flex-row items-center gap-3 rounded-2xl p-3"
				>
					<View
						className="bg-muted overflow-hidden rounded-xl"
						style={{ width: 48, height: 48 }}
					>
						{s.avatarFileId ? (
							<StorageImage
								kind="avatar"
								fileId={s.avatarFileId}
								variant="sm"
								style={{ width: 48, height: 48 }}
							/>
						) : null}
					</View>
					<View className="flex-1">
						<Text className="font-semibold" numberOfLines={1}>
							{s.name}
						</Text>
						<Text variant="muted" className="text-sm" numberOfLines={1}>
							{[s.species, s.pronouns].filter(Boolean).join(" · ")}
						</Text>
					</View>
					<Button
						size="icon"
						variant="ghost"
						disabled={i === 0}
						onPress={() => move(i, -1)}
						accessibilityLabel={t("discovery.moveUp")}
					>
						<Icon as={ArrowUp} size={16} />
					</Button>
					<Button
						size="icon"
						variant="ghost"
						disabled={i === sonas.length - 1}
						onPress={() => move(i, 1)}
						accessibilityLabel={t("discovery.moveDown")}
					>
						<Icon as={ArrowDown} size={16} />
					</Button>
					<Button
						size="icon"
						variant="ghost"
						onPress={() => router.push(`/discovery/sona/${s.id}` as never)}
						accessibilityLabel={t("discovery.editSona")}
					>
						<Icon as={Pencil} size={16} />
					</Button>
					<Button
						size="icon"
						variant="ghost"
						onPress={() => remove(s.id, s.name)}
						accessibilityLabel={t("discovery.deleteSona")}
					>
						<Icon as={Trash2} size={16} />
					</Button>
				</Card>
			))}
			<Button
				variant="secondary"
				disabled={sonas.length >= max}
				onPress={() => router.push("/discovery/sona/new" as never)}
			>
				<Icon as={Plus} size={16} />
				<Text>{t("discovery.addSona")}</Text>
			</Button>
		</ScrollView>
	);
}
