import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import {
	ActionSheet,
	type ActionSheetHandle,
	type SheetAction,
} from "@/components/chat/action-sheet";
import { MessagesPanel } from "@/components/chat/messages-panel";
import {
	NameDialog,
	type NameDialogHandle,
} from "@/components/chat/name-dialog";
import { ServerList } from "@/components/chat/server-list";
import { EmptyState } from "@/components/empty-state";
import {
	ArrowDown,
	ArrowUp,
	FolderInput,
	FolderOutput,
	FolderPlus,
	FolderX,
	HeartHandshake,
	MessagesSquare,
	Pencil,
	Plus,
} from "@/components/icons";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { PageTitle } from "@/components/ui/page-title";
import { useSession } from "@/lib/auth-client";
import {
	FOLDER_NAME_MAX,
	folderOf,
	moveIntoFolder,
	moveItem,
	newFolderWith,
	removeFolder,
	renameFolder,
	siblingsOf,
	takeOutOfFolder,
} from "@/lib/chat-layout";
import { useI18n } from "@/lib/i18n/provider";
import { useChatLayout } from "@/lib/use-chat-layout";

function SignedOut() {
	const { t } = useI18n();
	return (
		<View className="bg-background flex-1 px-4">
			<PageTitle title={t("chat.title")} />
			<View className="flex-1 items-center justify-center">
				<EmptyState
					icon={MessagesSquare}
					title={t("chat.signInPrompt")}
					action={{
						label: t("home.logIn"),
						onPress: () => router.push("/(auth)/login"),
					}}
				/>
			</View>
		</View>
	);
}

// The Chat tab: a Direct / Servers switch under the title. Direct is the list
// of direct and group chats; Servers lists followed communities and folders,
// and a server opens its channels as its own screen.
function ChatHome() {
	const { t } = useI18n();
	const { layout, serverById, commit, query } = useChatLayout();
	const [tab, setTab] = useState<"direct" | "servers">("direct");
	const menu = useRef<ActionSheetHandle>(null);
	const ask = useRef<NameDialogHandle>(null);

	const serverMenu = useCallback(
		(id: string) => {
			const server = serverById.get(id);
			const { prev, next } = siblingsOf(layout, id);
			const inFolder = folderOf(layout, id);
			const actions: SheetAction[] = [
				{
					key: "open",
					icon: HeartHandshake,
					label: t("chat.viewCommunity"),
					onPress: () => router.push(`/community/${id}`),
				},
			];
			if (prev)
				actions.push({
					key: "up",
					icon: ArrowUp,
					label: t("chat.moveUp"),
					onPress: () => commit(moveItem(layout, id, -1)),
				});
			if (next)
				actions.push({
					key: "down",
					icon: ArrowDown,
					label: t("chat.moveDown"),
					onPress: () => commit(moveItem(layout, id, 1)),
				});
			for (const item of layout.items) {
				if (item.type !== "folder" || item.id === inFolder?.id) continue;
				actions.push({
					key: `into:${item.id}`,
					icon: FolderInput,
					label: t("chat.moveToFolder", { name: item.name }),
					onPress: () => commit(moveIntoFolder(layout, id, item.id)),
				});
			}
			actions.push({
				key: "new-folder",
				icon: FolderPlus,
				label: t("chat.newFolder"),
				onPress: () =>
					ask.current?.open({
						title: t("chat.newFolder"),
						initial: t("chat.newFolder"),
						placeholder: t("chat.folderNamePlaceholder"),
						confirmLabel: t("common.create"),
						maxLength: FOLDER_NAME_MAX,
						onSubmit: (name) =>
							commit(
								newFolderWith(layout, id, { id: Crypto.randomUUID(), name }),
							),
					}),
			});
			if (inFolder)
				actions.push({
					key: "out",
					icon: FolderOutput,
					label: t("chat.takeOutOfFolder"),
					onPress: () => commit(takeOutOfFolder(layout, id)),
				});
			menu.current?.open(server?.name ?? "", actions);
		},
		[layout, serverById, commit, t],
	);

	const folderMenu = useCallback(
		(id: string) => {
			const folder = layout.items.find(
				(i) => i.type === "folder" && i.id === id,
			);
			if (folder?.type !== "folder") return;
			const { prev, next } = siblingsOf(layout, id);
			const actions: SheetAction[] = [
				{
					key: "rename",
					icon: Pencil,
					label: t("chat.renameFolder"),
					onPress: () =>
						ask.current?.open({
							title: t("chat.renameFolder"),
							initial: folder.name,
							placeholder: t("chat.folderNamePlaceholder"),
							confirmLabel: t("common.save"),
							maxLength: FOLDER_NAME_MAX,
							onSubmit: (name) => commit(renameFolder(layout, id, name)),
						}),
				},
			];
			if (prev)
				actions.push({
					key: "up",
					icon: ArrowUp,
					label: t("chat.moveUp"),
					onPress: () => commit(moveItem(layout, id, -1)),
				});
			if (next)
				actions.push({
					key: "down",
					icon: ArrowDown,
					label: t("chat.moveDown"),
					onPress: () => commit(moveItem(layout, id, 1)),
				});
			actions.push({
				key: "remove",
				icon: FolderX,
				label: t("chat.removeFolder"),
				destructive: true,
				onPress: () => commit(removeFolder(layout, id)),
			});
			menu.current?.open(folder.name, actions);
		},
		[layout, commit, t],
	);

	const header = (
		<View className="pb-2">
			<PageTitle
				title={t("chat.title")}
				action={{
					label: t("chat.newMessage"),
					icon: Plus,
					onPress: () => router.push("/chat/new"),
				}}
			/>
			<SegmentedTabs
				tabs={[
					{ key: "direct", label: t("chat.direct") },
					{ key: "servers", label: t("chat.servers") },
				]}
				value={tab}
				onChange={(key) => setTab(key === "servers" ? "servers" : "direct")}
			/>
		</View>
	);

	return (
		<View className="bg-background flex-1">
			{tab === "direct" ? (
				<MessagesPanel header={header} />
			) : (
				<ServerList
					header={header}
					layout={layout}
					serverById={serverById}
					loading={query.isLoading}
					refreshing={query.isRefetching}
					onRefresh={() => {
						void query.refetch();
					}}
					onServerMenu={serverMenu}
					onFolderMenu={folderMenu}
				/>
			)}
			<ActionSheet ref={menu} />
			<NameDialog ref={ask} />
		</View>
	);
}

export default function ChatTab() {
	const { data: session, isPending } = useSession();
	if (!session && !isPending) return <SignedOut />;
	return <ChatHome />;
}
