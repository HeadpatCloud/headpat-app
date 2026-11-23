import { FlexWidget, TextWidget } from "react-native-android-widget";
import { FONTS, Muted, WidgetFrame } from "@/widgets/android-ui/frame";
import type { WidgetChat, WidgetSnapshot } from "@/widgets/data";
import { type WidgetPalette, wt } from "@/widgets/look";

function ChatLine({
	chat,
	palette,
}: {
	chat: WidgetChat;
	palette: WidgetPalette;
}) {
	const what = chat.preview
		? (chat.preview.text ?? wt("chats.attachment"))
		: wt("chats.unreadMessages", { count: chat.unread });
	const who = chat.title ?? chat.preview?.sender ?? wt("chats.someone");
	return (
		<FlexWidget
			clickAction="OPEN_URI"
			clickActionData={{ uri: `headpat://chat/${chat.id}` }}
			style={{
				width: "match_parent",
				flexDirection: "row",
				alignItems: "center",
				paddingTop: 6,
			}}
		>
			<FlexWidget style={{ flex: 1, flexDirection: "column" }}>
				<TextWidget
					text={who}
					maxLines={1}
					truncate="END"
					style={{
						fontFamily: FONTS.bold,
						fontSize: 14,
						color: palette.foreground,
					}}
				/>
				<Muted palette={palette} text={what} />
			</FlexWidget>
			<FlexWidget
				style={{
					backgroundColor: palette.primary,
					borderRadius: 10,
					paddingHorizontal: 7,
					paddingVertical: 2,
					marginLeft: 8,
				}}
			>
				<TextWidget
					text={chat.unread > 99 ? "99+" : String(chat.unread)}
					style={{
						fontFamily: FONTS.bold,
						fontSize: 12,
						color: palette.primaryForeground,
					}}
				/>
			</FlexWidget>
		</FlexWidget>
	);
}

export function ChatsWidget({
	snapshot,
	palette,
	height,
	showPreviews,
}: {
	snapshot: WidgetSnapshot | null;
	palette: WidgetPalette;
	height: number;
	showPreviews: boolean;
}) {
	const label = wt("chats.label");
	const chats = snapshot?.chats;
	if (!snapshot?.signedIn || !chats) {
		return (
			<WidgetFrame palette={palette} uri="headpat://login" label={label}>
				<FlexWidget style={{ flex: 1, justifyContent: "center" }}>
					<TextWidget
						text={wt("chats.signIn")}
						maxLines={2}
						style={{
							fontFamily: FONTS.display,
							fontSize: 17,
							color: palette.foreground,
						}}
					/>
				</FlexWidget>
			</WidgetFrame>
		);
	}
	if (chats.conversations === 0) {
		return (
			<WidgetFrame palette={palette} uri="headpat://chat" label={label}>
				<FlexWidget style={{ flex: 1, justifyContent: "center" }}>
					<TextWidget
						text={wt("chats.caughtUp")}
						maxLines={1}
						style={{
							fontFamily: FONTS.display,
							fontSize: 18,
							color: palette.foreground,
						}}
					/>
					<Muted palette={palette} text={wt("chats.noUnread")} />
				</FlexWidget>
			</WidgetFrame>
		);
	}
	// Each chat line needs ~42dp under the 24dp label and 32dp of padding.
	const lines = showPreviews
		? Math.max(0, Math.floor((height - 56 - 48) / 42))
		: 0;
	return (
		<WidgetFrame palette={palette} uri="headpat://chat" label={label}>
			<FlexWidget
				style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}
			>
				<TextWidget
					text={String(chats.conversations)}
					style={{
						fontFamily: FONTS.display,
						fontSize: 30,
						color: palette.link,
					}}
				/>
				<FlexWidget
					style={{ flexDirection: "column", marginLeft: 10, flex: 1 }}
				>
					<TextWidget
						text={wt("chats.unreadChats", { count: chats.conversations })}
						maxLines={1}
						truncate="END"
						style={{
							fontFamily: FONTS.bold,
							fontSize: 14,
							color: palette.foreground,
						}}
					/>
					<Muted
						palette={palette}
						text={wt("chats.unreadMessages", { count: chats.messages })}
					/>
				</FlexWidget>
			</FlexWidget>
			{/* The widget tree builder flattens only one level of children, so
			    mapped rows get their own container. */}
			<FlexWidget style={{ width: "match_parent", flexDirection: "column" }}>
				{chats.items.slice(0, lines).map((chat) => (
					<ChatLine key={chat.id} chat={chat} palette={palette} />
				))}
			</FlexWidget>
		</WidgetFrame>
	);
}
