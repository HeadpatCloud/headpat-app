import { memo } from "react";
import { View } from "react-native";
import { HeartHandshake } from "@/components/icons";
import { StorageImage } from "@/components/storage-image";
import { Icon } from "@/components/ui/icon";
import type { RailServer } from "@/lib/use-chat-layout";

export const TILE = 44;
const MINI = 17;
const RADIUS = 12;
const MINI_RADIUS = 5;

// A community's square avatar in the rail, or a muted heart when it has none,
// like the website's server tiles.
export const ServerTile = memo(function ServerTile({
	server,
	size = TILE,
	radius = RADIUS,
}: {
	server: RailServer | undefined;
	size?: number;
	radius?: number;
}) {
	const box = { width: size, height: size, borderRadius: radius };
	if (!server?.avatarFileId)
		return (
			<View style={box} className="bg-muted items-center justify-center">
				<Icon
					as={HeartHandshake}
					size={Math.round(size * 0.45)}
					className="text-muted-foreground"
				/>
			</View>
		);
	return (
		<StorageImage
			kind="community-avatar"
			fileId={server.avatarFileId}
			variant="sm"
			transition={0}
			style={box}
			accessibilityElementsHidden
		/>
	);
});

// A closed folder: up to four of its servers in a 2x2 grid.
export const FolderTile = memo(function FolderTile({
	serverIds,
	serverById,
}: {
	serverIds: string[];
	serverById: Map<string, RailServer>;
}) {
	return (
		<View
			style={{ width: TILE, height: TILE, borderRadius: RADIUS }}
			className="bg-muted/70 flex-row flex-wrap content-center justify-center gap-[3px] p-[3px]"
		>
			{serverIds.slice(0, 4).map((id) => (
				<ServerTile
					key={id}
					server={serverById.get(id)}
					size={MINI}
					radius={MINI_RADIUS}
				/>
			))}
		</View>
	);
});
