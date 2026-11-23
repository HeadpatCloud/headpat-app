import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { memo, useCallback, useEffect, useRef } from "react";
import {
	Alert,
	Pressable,
	RefreshControl,
	ScrollView,
	View,
} from "react-native";
import {
	ActionSheet,
	type ActionSheetHandle,
} from "@/components/chat/action-sheet";
import {
	NameDialog,
	type NameDialogHandle,
} from "@/components/chat/name-dialog";
import { ServerTile } from "@/components/chat/server-tile";
import { EmptyState } from "@/components/empty-state";
import {
	Hash,
	MessagesSquare,
	Pencil,
	Plus,
	Trash2,
	Volume2,
} from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import type { Channel } from "@/lib/chat";
import { useI18n } from "@/lib/i18n/provider";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { useTheme } from "@/lib/theme/provider";

const STAFF = new Set(["owner", "admin", "moderator"]);
const CHANNEL_NAME_MAX = 100;

const ChannelRow = memo(function ChannelRow({
	channel,
	onMenu,
}: {
	channel: Channel;
	onMenu: ((channel: Channel) => void) | null;
}) {
	// Voice channels show but can't be opened yet, like on the website.
	const voice = channel.type === "voice";
	return (
		<Pressable
			onPress={voice ? undefined : () => router.push(`/chat/c/${channel.id}`)}
			onLongPress={onMenu ? () => onMenu(channel) : undefined}
			delayLongPress={350}
			disabled={voice && !onMenu}
			accessibilityRole={voice ? undefined : "button"}
			accessibilityLabel={channel.name}
			className="active:bg-muted flex-row items-center gap-3 rounded-2xl px-3 py-3"
		>
			<Icon
				as={voice ? Volume2 : Hash}
				size={20}
				className={voice ? "text-muted-foreground/55" : "text-muted-foreground"}
			/>
			<Text
				numberOfLines={1}
				className={`flex-1 font-bold ${voice ? "text-muted-foreground/55" : "text-foreground"}`}
			>
				{channel.name}
			</Text>
		</Pressable>
	);
});

// A server's channels, opened from the Servers list in the Chat tab. Staff
// get a + to add channels and a long-press menu on each one.
export default function ServerScreen() {
	const { communityId } = useLocalSearchParams<{ communityId: string }>();
	const { t } = useI18n();
	const { colors } = useTheme();
	const qc = useQueryClient();
	const menu = useRef<ActionSheetHandle>(null);
	const ask = useRef<NameDialogHandle>(null);

	// The Servers list's cached data has the name and avatar already.
	const server = useQuery({
		...orpc.sidebarLayout.get.queryOptions({ input: undefined }),
		select: (d) => d.servers.find((s) => s.id === communityId),
	}).data;
	const channels = useQuery(
		orpc.channel.listByCommunity.queryOptions({ input: { communityId } }),
	);
	const role = useQuery({
		...orpc.community.myRoleIn.queryOptions({ input: { communityId } }),
		staleTime: 5 * 60_000,
	});
	const staff = STAFF.has(role.data?.role ?? "");

	// Seed each channel's own cache from the list, so opening one shows its
	// name at once instead of waiting for channel.byId.
	useEffect(() => {
		for (const ch of channels.data ?? []) {
			const key = orpc.channel.byId.queryKey({ input: { channelId: ch.id } });
			if (!qc.getQueryData(key)) qc.setQueryData(key, ch);
		}
	}, [channels.data, qc]);

	const refreshChannels = useCallback(
		() =>
			qc.invalidateQueries({
				queryKey: orpc.channel.listByCommunity.key({ input: { communityId } }),
			}),
		[qc, communityId],
	);
	const fail = useCallback(
		(e: unknown) => Alert.alert(t("common.error"), humanizeError(e)),
		[t],
	);

	const createChannel = useCallback(
		() =>
			ask.current?.open({
				title: t("chat.createChannelTitle"),
				placeholder: t("chat.newChannelPlaceholder"),
				confirmLabel: t("common.create"),
				maxLength: CHANNEL_NAME_MAX,
				onSubmit: (name) =>
					client.channel
						.create({ communityId, name })
						.then(refreshChannels)
						.catch(fail),
			}),
		[communityId, refreshChannels, fail, t],
	);

	const channelMenu = useCallback(
		(ch: Channel) =>
			menu.current?.open(`#${ch.name}`, [
				{
					key: "rename",
					icon: Pencil,
					label: t("chat.renameChannel"),
					onPress: () =>
						ask.current?.open({
							title: t("chat.renameChannelTitle"),
							initial: ch.name,
							placeholder: t("chat.channelNamePlaceholder"),
							confirmLabel: t("common.save"),
							maxLength: CHANNEL_NAME_MAX,
							onSubmit: (name) =>
								client.channel
									.rename({ channelId: ch.id, name })
									.then(() => {
										qc.invalidateQueries({
											queryKey: orpc.channel.byId.key({
												input: { channelId: ch.id },
											}),
										});
										return refreshChannels();
									})
									.catch(fail),
						}),
				},
				{
					key: "delete",
					icon: Trash2,
					label: t("chat.deleteChannel"),
					destructive: true,
					onPress: () =>
						Alert.alert(
							t("chat.deleteChannelConfirm", { name: ch.name }),
							t("chat.deleteChannelDescription"),
							[
								{ text: t("common.cancel"), style: "cancel" },
								{
									text: t("common.delete"),
									style: "destructive",
									onPress: () => {
										client.channel
											.delete({ channelId: ch.id })
											.then(refreshChannels)
											.catch(fail);
									},
								},
							],
						),
				},
			]),
		[qc, refreshChannels, fail, t],
	);

	return (
		<View className="bg-background flex-1">
			<Stack.Screen
				options={{
					title: server?.name ?? "",
					headerTitleAlign: "center",
					headerRight: () => (
						<View className="flex-row items-center gap-3">
							{staff ? (
								<Pressable
									onPress={createChannel}
									accessibilityRole="button"
									accessibilityLabel={t("chat.createChannel")}
									hitSlop={8}
									className="bg-primary active:opacity-80 h-9 w-9 items-center justify-center rounded-full"
								>
									<Icon
										as={Plus}
										size={18}
										className="text-primary-foreground"
									/>
								</Pressable>
							) : null}
							<Pressable
								onPress={() => router.push(`/community/${communityId}`)}
								accessibilityRole="link"
								accessibilityLabel={t("chat.viewCommunity")}
								hitSlop={8}
							>
								<ServerTile server={server} size={36} radius={10} />
							</Pressable>
						</View>
					),
				}}
			/>
			{channels.isLoading ? (
				<View className="gap-2 px-4 pt-2">
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-11 rounded-2xl" />
					))}
				</View>
			) : (
				<ScrollView
					className="flex-1"
					contentContainerClassName="gap-0.5 px-3 pb-6 pt-1"
					refreshControl={
						<RefreshControl
							refreshing={channels.isRefetching}
							onRefresh={() => {
								void channels.refetch();
							}}
							tintColor={colors.primary}
							colors={[colors.primary]}
						/>
					}
				>
					{channels.isError ? (
						<EmptyState
							icon={MessagesSquare}
							title={t("common.couldntLoad")}
							subtitle={humanizeError(channels.error)}
							action={{
								label: t("common.retry"),
								onPress: () => channels.refetch(),
							}}
						/>
					) : channels.data?.length ? (
						channels.data.map((ch) => (
							<ChannelRow
								key={ch.id}
								channel={ch}
								onMenu={staff ? channelMenu : null}
							/>
						))
					) : (
						<EmptyState icon={Hash} title={t("chat.noChannels")} />
					)}
				</ScrollView>
			)}
			<ActionSheet ref={menu} />
			<NameDialog ref={ask} />
		</View>
	);
}
