import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { memo } from "react";
import { Pressable, View } from "react-native";
import { ChatMedia } from "@/components/chat/chat-media";
import { VoicePlayer } from "@/components/chat/voice-player";
import { FileIcon } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { orpc } from "@/lib/orpc";

function humanSize(bytes: number | null | undefined): string {
	if (!bytes) return "";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const open = (url: string) => {
	WebBrowser.openBrowserAsync(url).catch(() => {});
};

export const MessageAttachment = memo(function MessageAttachment({
	attachmentKey,
	onLongPress,
	voice,
}: {
	attachmentKey: string;
	onLongPress?: () => void;
	/** A voice message: loads as a player-sized placeholder. */
	voice?: boolean;
}) {
	const { t } = useI18n();
	const q = useQuery({
		...orpc.storage.attachmentUrl.queryOptions({
			input: { key: attachmentKey, variant: "md" },
		}),
		// Presigned URLs last a few minutes; refetch just before they lapse.
		staleTime: 4 * 60_000,
	});
	if (q.isPending)
		return voice ? (
			<Skeleton className="h-12 w-72 max-w-full rounded-2xl" />
		) : (
			<Skeleton className="h-32 w-48 rounded-2xl" />
		);
	if (!q.data) return null;
	const { url, mimeType, sizeBytes, posterUrl, durationMs, waveform } = q.data;
	const mime = mimeType ?? "";

	if (mime.startsWith("audio/")) {
		return (
			<VoicePlayer
				uri={url}
				durationMs={durationMs}
				waveform={waveform}
				onLongPress={onLongPress}
			/>
		);
	}

	if (mime.startsWith("image/") || mime.startsWith("video/")) {
		return (
			<ChatMedia
				uri={mime.startsWith("image/") ? url : (posterUrl ?? url)}
				cacheId={attachmentKey}
				onPress={() => open(url)}
				onLongPress={onLongPress}
			/>
		);
	}
	return (
		<Pressable
			onPress={() => open(url)}
			onLongPress={onLongPress}
			delayLongPress={300}
			accessibilityRole="link"
			className="bg-card border-border flex-row items-center gap-2 rounded-2xl border px-3 py-2"
		>
			<Icon as={FileIcon} size={16} className="text-muted-foreground" />
			<Text numberOfLines={1} className="max-w-48 text-sm font-semibold">
				{mime || t("chat.fileFallback")}
			</Text>
			<View>
				<Text className="text-muted-foreground text-xs">
					{humanSize(sizeBytes)}
				</Text>
			</View>
		</Pressable>
	);
});
