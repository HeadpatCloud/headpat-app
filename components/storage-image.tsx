import { useQuery } from "@tanstack/react-query";
import { Image, type ImageProps } from "expo-image";
import { ImageOff } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { orpc } from "@/lib/orpc";

export type StorageKind =
	| "gallery"
	| "avatar"
	| "banner"
	| "community-avatar"
	| "community-banner";

type Props = Omit<ImageProps, "source" | "placeholder"> & {
	kind: StorageKind;
	fileId?: string | null;
	variant?: string;
	blurhash?: string | null;
	radius?: number;
	onError?: () => void;
};

/**
 * Resolves a presigned URL for a stored file and renders it with expo-image.
 * Presigned URLs expire (~5 min) so we cache just under that and fall back to
 * the blurhash placeholder while loading. On load failure we render a muted
 * tile with a low-opacity icon instead of a broken image.
 */
export function StorageImage({
	kind,
	fileId,
	variant,
	blurhash,
	radius,
	onError,
	contentFit = "cover",
	style,
	...rest
}: Props) {
	const reduced = useReducedMotion();
	const [failed, setFailed] = useState(false);

	const { data } = useQuery({
		...orpc.storage.url.queryOptions({
			input: { kind, fileId: fileId ?? "", ...(variant ? { variant } : {}) },
		}),
		enabled: !!fileId,
		staleTime: 4 * 60 * 1000,
	});

	const radiusStyle = radius != null ? { borderRadius: radius } : undefined;

	if (failed) {
		return (
			<View
				accessibilityLabel="Image failed to load"
				className="items-center justify-center bg-muted"
				style={[radiusStyle, style]}
			>
				<Icon as={ImageOff} className="text-muted-foreground opacity-40" size={24} />
			</View>
		);
	}

	return (
		<Image
			source={data?.url}
			placeholder={blurhash ? { blurhash } : undefined}
			placeholderContentFit="cover"
			recyclingKey={fileId ?? undefined}
			contentFit={contentFit}
			transition={reduced ? 0 : 200}
			onError={() => {
				setFailed(true);
				onError?.();
			}}
			className={blurhash ? undefined : "bg-muted"}
			style={[radiusStyle, style]}
			{...rest}
		/>
	);
}
