import {
	BottomSheetBackdrop,
	type BottomSheetBackdropProps,
	type BottomSheetBackgroundProps,
	BottomSheetModal,
	BottomSheetView,
} from "@gorhom/bottom-sheet";
import { forwardRef, type ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function SheetBackground({ style }: BottomSheetBackgroundProps) {
	return (
		<View
			style={style}
			className="bg-card border-border rounded-t-3xl border-t"
		/>
	);
}

function SheetHandle() {
	return (
		<View className="items-center py-3">
			<View className="bg-muted-foreground/30 h-1 w-10 rounded-full" />
		</View>
	);
}

function Backdrop(props: BottomSheetBackdropProps) {
	return (
		<BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
	);
}

/**
 * Themed bottom sheet wrapper. Use a ref: sheetRef.current?.present() / .dismiss().
 * Sizes to its content (enableDynamicSizing).
 */
export const Sheet = forwardRef<BottomSheetModal, { children: ReactNode }>(
	({ children }, ref) => {
		const insets = useSafeAreaInsets();
		return (
			<BottomSheetModal
				ref={ref}
				enableDynamicSizing
				backgroundComponent={SheetBackground}
				handleComponent={SheetHandle}
				backdropComponent={Backdrop}
			>
				<BottomSheetView
					style={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}
				>
					{children}
				</BottomSheetView>
			</BottomSheetModal>
		);
	},
);
Sheet.displayName = "Sheet";
