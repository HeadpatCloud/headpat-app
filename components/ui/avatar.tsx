import { PixelRatio, View } from "react-native";
import { StorageImage, type StorageKind } from "@/components/storage-image";
import { Gradient } from "@/components/ui/gradient";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/lib/theme/provider";
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
	ring = false,
	ringWidth = 3,
	fallback = "gradient",
	className,
}: {
	fileId?: string | null;
	name?: string | null;
	size?: number;
	kind?: StorageKind;
	ring?: boolean;
	ringWidth?: number;
	fallback?: "gradient" | "muted";
	className?: string;
}) {
	const { colors } = useTheme();
	const label = name ? `${name}'s avatar` : "Avatar";
	const style = { width: size, height: size, borderRadius: size / 2 };

	const inner = fileId ? (
		<StorageImage
			kind={kind}
			fileId={fileId}
			variant={size * PixelRatio.get() <= 96 ? "sm" : "md"}
			transition={0}
			style={style}
			accessibilityLabel={label}
		/>
	) : fallback === "muted" ? (
		<View
			style={style}
			className={cn("bg-muted items-center justify-center", className)}
			accessibilityLabel={label}
		>
			<Text
				className="text-muted-foreground font-semibold"
				style={{ fontSize: size * 0.4 }}
			>
				{initials(name)}
			</Text>
		</View>
	) : (
		<Gradient
			borderRadius={size / 2}
			style={[style, { alignItems: "center", justifyContent: "center" }]}
			accessibilityLabel={label}
		>
			<Text
				className="font-semibold"
				style={{ fontSize: size * 0.4, color: colors["primary-foreground"] }}
			>
				{initials(name)}
			</Text>
		</Gradient>
	);

	if (!ring) return inner;

	const outer = size + ringWidth * 2;
	return (
		<Gradient
			borderRadius={outer / 2}
			accessibilityLabel={label}
			style={{
				width: outer,
				height: outer,
				padding: ringWidth,
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
				{inner}
			</View>
		</Gradient>
	);
}
