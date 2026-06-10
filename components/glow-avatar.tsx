import { View, type ViewProps } from "react-native";
import type { StorageKind } from "@/components/storage-image";
import { Avatar } from "@/components/ui/avatar";
import { GlowShadow } from "@/components/ui/gradient";
import { useTheme } from "@/lib/theme/provider";
import { cn } from "@/lib/utils";

type GlowAvatarProps = ViewProps & {
	fileId?: string | null;
	name?: string | null;
	kind?: StorageKind;
	size?: number;
};

// Avatar that overhangs a banner: background ring + soft primary glow halo.
export function GlowAvatar({
	fileId,
	name,
	kind = "avatar",
	size = 64,
	className,
	style,
	...props
}: GlowAvatarProps) {
	const { glow } = useTheme();
	return (
		<View
			className={cn(
				"border-background self-start rounded-full border-4",
				className,
			)}
			style={[GlowShadow(glow), style]}
			{...props}
		>
			<Avatar fileId={fileId} name={name} kind={kind} size={size} />
		</View>
	);
}
