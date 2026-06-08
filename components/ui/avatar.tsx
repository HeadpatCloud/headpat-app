import { View } from "react-native";
import { StorageImage, type StorageKind } from "@/components/storage-image";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

function initials(name?: string | null): string {
	if (!name) return "?";
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((p) => p[0]?.toUpperCase() ?? "")
		.join("");
}

export function Avatar({
	fileId,
	name,
	size = 40,
	kind = "avatar",
	className,
}: {
	fileId?: string | null;
	name?: string | null;
	size?: number;
	kind?: StorageKind;
	className?: string;
}) {
	const style = { width: size, height: size, borderRadius: size / 2 };
	if (fileId) {
		return (
			<StorageImage
				kind={kind}
				fileId={fileId}
				style={style}
				accessibilityLabel={name ? `${name}'s avatar` : "Avatar"}
			/>
		);
	}
	return (
		<View
			style={style}
			className={cn("bg-muted items-center justify-center", className)}
			accessibilityLabel={name ? `${name}'s avatar` : "Avatar"}
		>
			<Text
				className="text-muted-foreground font-semibold"
				style={{ fontSize: size * 0.4 }}
			>
				{initials(name)}
			</Text>
		</View>
	);
}
