import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { forwardRef, useState } from "react";
import { Alert, View } from "react-native";
import { DurationPicker } from "@/components/locations/duration-picker";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { locationApi, locationQueries } from "@/lib/location/api";
import { humanizeError } from "@/lib/orpc-error";

export const ExtendSheet = forwardRef<
	BottomSheetModal,
	{ shareId: string | null }
>(({ shareId }, ref) => {
	const { t } = useI18n();
	const qc = useQueryClient();
	const [busy, setBusy] = useState(false);

	const onPick = async (expiresAt: string | null) => {
		if (!shareId || busy) return;
		setBusy(true);
		try {
			await locationApi.extend({ shareId, expiresAt });
			await qc.invalidateQueries({ queryKey: locationQueries.mine().queryKey });
			(ref as React.RefObject<BottomSheetModal>).current?.dismiss();
		} catch (e) {
			Alert.alert(t("locations.errorTitle"), humanizeError(e));
		} finally {
			setBusy(false);
		}
	};

	return (
		<Sheet ref={ref} title={t("locations.extendTitle")} accent>
			<View className="gap-2 pb-2">
				<Text variant="muted">{t("locations.pickDuration")}</Text>
				<DurationPicker onChange={(exp) => onPick(exp)} />
			</View>
		</Sheet>
	);
});
ExtendSheet.displayName = "ExtendSheet";
