import { useQuery } from "@tanstack/react-query";
import { Image, type ImageProps } from "expo-image";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { ImageOff } from "@/components/icons";
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
 * Presigned URLs expire (~5 min), so on a load failure we fetch a fresh one and
 * retry once before showing the muted fallback. State resets on `fileId` change
 * because FlashList recycles instances — otherwise one failed image would stick
 * to every item the cell is later reused for.
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
	const [retries, setRetries] = useState(0);
	const [failed, setFailed] = useState(false);

	const { data, isError, refetch } = useQuery({
		...orpc.storage.url.queryOptions({
			input: {
				kind,
				fileId: fileId ?? "",
				expirySec: 3600,
				...(variant ? { variant } : {}),
			},
		}),
		enabled: !!fileId,
		staleTime: 50 * 60 * 1000,
		retry: 2,
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: fileId change = recycled cell, reset state
	useEffect(() => {
		setRetries(0);
		setFailed(false);
	}, [fileId]);

	const radiusStyle = radius != null ? { borderRadius: radius } : undefined;
	// The backend hashes every upload; the URL response carries it for kinds
	// that don't ship a hash with their own data (avatars, banners).
	const hash = blurhash ?? data?.blurHash ?? undefined;

	if (isError || failed) {
		return (
			<View
				accessibilityLabel="Image failed to load"
				className="items-center justify-center bg-muted"
				style={[radiusStyle, style]}
			>
				<Icon
					as={ImageOff}
					className="text-muted-foreground opacity-40"
					size={24}
				/>
			</View>
		);
	}

	return (
		<Image
			// cacheKey: presigned URLs rotate per signature, which would defeat the
			// disk cache; the served object key is the stable identity.
			source={data ? { uri: data.url, cacheKey: data.key } : undefined}
			placeholder={hash ? { blurhash: hash } : undefined}
			placeholderContentFit="cover"
			recyclingKey={fileId ?? undefined}
			contentFit={contentFit}
			cachePolicy="memory-disk"
			transition={reduced ? 0 : 200}
			onError={() => {
				// Most failures are an expired presigned URL — fetch a fresh one and
				// retry once before giving up.
				if (retries < 1) {
					setRetries((r) => r + 1);
					refetch();
				} else {
					setFailed(true);
					onError?.();
				}
			}}
			// constant on purpose: hash arrives async and css-interop dislikes
			// runtime className changes; the image covers this once loaded
			className="bg-muted"
			style={[radiusStyle, style]}
			{...rest}
		/>
	);
}
