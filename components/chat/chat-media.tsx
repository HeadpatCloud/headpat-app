import { Image } from "expo-image";
import { memo, useState } from "react";
import { Pressable } from "react-native";

const MAX_W = 260;
const MAX_H = 320;

// Natural sizes, remembered across recycled rows so media doesn't jump back to
// the placeholder shape when it scrolls into view again.
const ratios = new Map<string, number>();

function boxFor(ratio: number) {
	// Widest box that keeps the ratio inside MAX_W x MAX_H.
	const w = Math.min(MAX_W, MAX_H * ratio);
	return { width: w, height: w / ratio };
}

type Props = {
	uri: string;
	cacheId: string;
	onPress?: () => void;
	onLongPress?: () => void;
	accessibilityLabel?: string;
};

// A chat image or GIF shown whole: the box takes the media's own aspect ratio
// (learned on load), capped so tall or wide media still fits on screen.
export const ChatMedia = memo(function ChatMedia({
	uri,
	cacheId,
	onPress,
	onLongPress,
	accessibilityLabel,
}: Props) {
	const [ratio, setRatio] = useState(() => ratios.get(cacheId) ?? 4 / 3);
	const size = boxFor(ratio);
	return (
		<Pressable
			onPress={onPress}
			onLongPress={onLongPress}
			delayLongPress={300}
			accessibilityRole={onPress ? "imagebutton" : "image"}
			accessibilityLabel={accessibilityLabel}
			className="bg-muted self-start overflow-hidden rounded-2xl"
			style={size}
		>
			<Image
				source={{ uri }}
				cachePolicy="memory-disk"
				recyclingKey={cacheId}
				contentFit="contain"
				style={size}
				onLoad={(e) => {
					const { width, height } = e.source;
					if (!width || !height) return;
					const next = width / height;
					ratios.set(cacheId, next);
					if (Math.abs(next - ratio) > 0.01) setRatio(next);
				}}
			/>
		</Pressable>
	);
});
