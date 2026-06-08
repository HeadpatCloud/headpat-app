import { useQuery } from "@tanstack/react-query";
import { Image, type ImageProps } from "expo-image";
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
};

/**
 * Resolves a presigned URL for a stored file and renders it with expo-image.
 * Presigned URLs expire (~5 min) so we cache just under that and fall back to
 * the blurhash placeholder while loading.
 */
export function StorageImage({
	kind,
	fileId,
	variant,
	blurhash,
	...rest
}: Props) {
	const { data } = useQuery({
		...orpc.storage.url.queryOptions({
			input: { kind, fileId: fileId ?? "", ...(variant ? { variant } : {}) },
		}),
		enabled: !!fileId,
		staleTime: 4 * 60 * 1000,
	});

	return (
		<Image
			source={data?.url}
			placeholder={blurhash ? { blurhash } : undefined}
			transition={200}
			{...rest}
		/>
	);
}
