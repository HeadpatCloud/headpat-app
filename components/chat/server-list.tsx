import { router } from "expo-router";
import { memo, type ReactElement, useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	LinearTransition,
} from "react-native-reanimated";
import { ServerTile } from "@/components/chat/server-tile";
import { EmptyState } from "@/components/empty-state";
import {
	ChevronDown,
	ChevronRight,
	Folder,
	HeartHandshake,
	Plus,
} from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import type { ChatLayout } from "@/lib/chat-layout";
import { useI18n } from "@/lib/i18n/provider";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { durations, springs } from "@/lib/motion/springs";
import { useTheme } from "@/lib/theme/provider";
import type { RailServer } from "@/lib/use-chat-layout";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 350;

const layoutAnim = LinearTransition.springify()
	.damping(springs.layout.damping)
	.stiffness(springs.layout.stiffness)
	.mass(springs.layout.mass);

const ServerRow = memo(function ServerRow({
	id,
	server,
	nested,
	onMenu,
}: {
	id: string;
	server: RailServer | undefined;
	nested: boolean;
	onMenu: (id: string) => void;
}) {
	return (
		<Pressable
			onPress={() => router.push(`/chat/s/${id}`)}
			onLongPress={() => onMenu(id)}
			delayLongPress={LONG_PRESS_MS}
			accessibilityRole="button"
			accessibilityLabel={server?.name}
			className={cn(
				"active:bg-muted flex-row items-center gap-3 rounded-2xl p-2",
				nested && "pl-4",
			)}
		>
			<ServerTile server={server} />
			<Text numberOfLines={1} className="flex-1 font-extrabold">
				{server?.name ?? ""}
			</Text>
			<Icon as={ChevronRight} size={18} className="text-muted-foreground" />
		</Pressable>
	);
});

type Props = {
	header: ReactElement;
	layout: ChatLayout;
	serverById: Map<string, RailServer>;
	loading: boolean;
	refreshing: boolean;
	onRefresh: () => void;
	onServerMenu: (serverId: string) => void;
	onFolderMenu: (folderId: string) => void;
};

// The Servers side of the Chat tab: followed communities in the user's own
// order (shared with the website's rail), folders as sections that fold.
// A long press on a server or folder opens its menu; the website drags.
export const ServerList = memo(function ServerList({
	header,
	layout,
	serverById,
	loading,
	refreshing,
	onRefresh,
	onServerMenu,
	onFolderMenu,
}: Props) {
	const { t } = useI18n();
	const { colors } = useTheme();
	const reduced = useReducedMotion();
	// Folders start open; this holds the ones the user folded.
	const [closed, setClosed] = useState<ReadonlySet<string>>(() => new Set());
	const toggle = useCallback(
		(id: string) =>
			setClosed((cur) => {
				const next = new Set(cur);
				if (next.has(id)) next.delete(id);
				else next.add(id);
				return next;
			}),
		[],
	);
	const anim = reduced ? undefined : layoutAnim;
	const enter = reduced ? undefined : FadeIn.duration(durations.base);
	const exit = reduced ? undefined : FadeOut.duration(durations.fast);
	const findServers = () => router.push("/community");

	return (
		<ScrollView
			className="flex-1"
			contentContainerClassName="px-4 pb-4"
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={onRefresh}
					tintColor={colors.primary}
					colors={[colors.primary]}
				/>
			}
		>
			{header}
			{loading ? (
				<View className="gap-2">
					{[0, 1, 2, 3].map((i) => (
						<View key={i} className="flex-row items-center gap-3 p-2">
							<Skeleton className="h-11 w-11 rounded-xl" />
							<Skeleton className="h-4 w-1/2 rounded-full" />
						</View>
					))}
				</View>
			) : layout.items.length === 0 ? (
				<EmptyState
					icon={HeartHandshake}
					title={t("chat.noServers")}
					action={{ label: t("chat.findServers"), onPress: findServers }}
				/>
			) : (
				<>
					{layout.items.map((item) => {
						if (item.type === "server")
							return (
								<Animated.View key={item.id} layout={anim}>
									<ServerRow
										id={item.id}
										server={serverById.get(item.id)}
										nested={false}
										onMenu={onServerMenu}
									/>
								</Animated.View>
							);
						const open = !closed.has(item.id);
						return (
							<Animated.View key={item.id} layout={anim}>
								<Pressable
									onPress={() => toggle(item.id)}
									onLongPress={() => onFolderMenu(item.id)}
									delayLongPress={LONG_PRESS_MS}
									accessibilityRole="button"
									accessibilityLabel={item.name}
									accessibilityState={{ expanded: open }}
									className="active:bg-muted mt-2 flex-row items-center gap-2 rounded-2xl px-2 py-2"
								>
									<Icon
										as={open ? ChevronDown : ChevronRight}
										size={16}
										className="text-muted-foreground"
									/>
									<Icon as={Folder} size={16} className="text-link" />
									<Text
										numberOfLines={1}
										className="text-muted-foreground flex-1 text-xs font-extrabold uppercase tracking-wider"
									>
										{item.name}
									</Text>
									<Text className="text-muted-foreground text-xs font-bold">
										{item.serverIds.length}
									</Text>
								</Pressable>
								{open
									? item.serverIds.map((id) => (
											<Animated.View
												key={id}
												layout={anim}
												entering={enter}
												exiting={exit}
											>
												<ServerRow
													id={id}
													server={serverById.get(id)}
													nested
													onMenu={onServerMenu}
												/>
											</Animated.View>
										))
									: null}
							</Animated.View>
						);
					})}
					<Pressable
						onPress={findServers}
						accessibilityRole="button"
						className="active:bg-muted mt-2 flex-row items-center gap-3 rounded-2xl p-2"
					>
						<View className="border-border h-11 w-11 items-center justify-center rounded-xl border border-dashed">
							<Icon as={Plus} size={20} className="text-muted-foreground" />
						</View>
						<Text className="text-muted-foreground flex-1 font-bold">
							{t("chat.findServers")}
						</Text>
					</Pressable>
				</>
			)}
		</ScrollView>
	);
});
