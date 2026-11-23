import { useState } from "react";
import { Modal, Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Eye, X } from "@/components/icons";
import { StorageImage } from "@/components/storage-image";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useBlurAdult } from "@/lib/blur-adult";
import { useI18n } from "@/lib/i18n/provider";

// 18+ photos stay blurred in the grid; tapping one shows it full screen and
// unblurred. Nothing is shown unblurred until someone asks for it.
export function BlurredImage({
	fileId,
	caption,
	size,
}: {
	fileId: string;
	caption?: string | null;
	size: number;
}) {
	const { t } = useI18n();
	const insets = useSafeAreaInsets();
	const { width, height } = useWindowDimensions();
	const [open, setOpen] = useState(false);
	const blur = useBlurAdult();
	return (
		<>
			<Pressable
				onPress={() => setOpen(true)}
				accessibilityRole="button"
				accessibilityLabel={t("discovery.showPhoto")}
				className="bg-muted overflow-hidden rounded-xl"
				style={{ width: size, height: size }}
			>
				<StorageImage
					kind="gallery"
					fileId={fileId}
					variant="320"
					blurRadius={blur ? 40 : undefined}
					transition={0}
					style={{ width: size, height: size }}
				/>
				{blur ? (
					<View className="absolute inset-0 items-center justify-center gap-1 bg-black/30">
						<Icon as={Eye} size={20} className="text-white" />
						<Text className="text-xs font-semibold text-white">
							{t("discovery.showPhoto")}
						</Text>
					</View>
				) : null}
			</Pressable>
			<Modal
				visible={open}
				transparent
				animationType="fade"
				onRequestClose={() => setOpen(false)}
				statusBarTranslucent
			>
				<View className="flex-1 bg-black">
					<StorageImage
						kind="gallery"
						fileId={fileId}
						variant="1280"
						contentFit="contain"
						style={{ width, height }}
					/>
					{caption ? (
						<View
							className="absolute inset-x-0 bg-black/60 px-4 py-3"
							style={{ bottom: insets.bottom }}
						>
							<Text className="text-white">{caption}</Text>
						</View>
					) : null}
					<Pressable
						onPress={() => setOpen(false)}
						accessibilityRole="button"
						accessibilityLabel={t("discovery.close")}
						className="absolute right-4 rounded-full bg-black/60 p-2"
						style={{ top: insets.top + 8 }}
						hitSlop={12}
					>
						<Icon as={X} size={22} className="text-white" />
					</Pressable>
				</View>
			</Modal>
		</>
	);
}
