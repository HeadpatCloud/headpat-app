import { useState } from "react";
import { Alert, View } from "react-native";
import { StorageImage } from "@/components/storage-image";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { humanizeError } from "@/lib/orpc-error";
import { pickImage, uploadImage } from "@/lib/upload";

/** Picks and uploads one image, reporting the new fileId (or null on remove). */
export function ImagePick({
	kind,
	fileId,
	onChange,
	label,
	square,
}: {
	kind: "avatar" | "gallery";
	fileId: string | null;
	onChange: (fileId: string | null) => void;
	label: string;
	square?: boolean;
}) {
	const { t } = useI18n();
	const [busy, setBusy] = useState(false);
	const pick = async () => {
		const asset = await pickImage(
			square ? { allowsEditing: true, aspect: [1, 1] } : undefined,
		);
		if (!asset) return;
		setBusy(true);
		try {
			onChange(await uploadImage(kind, asset));
		} catch (e) {
			Alert.alert(t("locations.errorTitle"), humanizeError(e));
		} finally {
			setBusy(false);
		}
	};
	return (
		<View className="gap-1.5">
			<Text variant="small" className="text-muted-foreground">
				{label}
			</Text>
			<View className="flex-row items-center gap-3">
				<View
					className="bg-muted overflow-hidden rounded-xl"
					style={
						square ? { width: 64, height: 64 } : { width: 112, height: 64 }
					}
				>
					{fileId ? (
						<StorageImage
							kind={kind}
							fileId={fileId}
							variant={kind === "avatar" ? "sm" : "320"}
							contentFit={square ? "cover" : "contain"}
							style={
								square ? { width: 64, height: 64 } : { width: 112, height: 64 }
							}
						/>
					) : null}
				</View>
				<Button
					size="sm"
					variant="secondary"
					loading={busy}
					disabled={busy}
					onPress={pick}
				>
					<Text>{t("discovery.chooseImage")}</Text>
				</Button>
				{fileId ? (
					<Button size="sm" variant="ghost" onPress={() => onChange(null)}>
						<Text>{t("discovery.removeImage")}</Text>
					</Button>
				) : null}
			</View>
		</View>
	);
}
