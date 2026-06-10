import {
	BottomSheetBackdrop,
	type BottomSheetBackdropProps,
	type BottomSheetBackgroundProps,
	BottomSheetModal,
	BottomSheetView,
	useBottomSheetSpringConfigs,
	useBottomSheetTimingConfigs,
} from "@gorhom/bottom-sheet";
import { forwardRef, type ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gradient } from "@/components/ui/gradient";
import { Text } from "@/components/ui/text";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { durations, springs } from "@/lib/motion/springs";

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
 * Sizes to its content (enableDynamicSizing). Pass `title` for a header row and
 * `accent` for a slim gradient hairline at the top.
 */
export const Sheet = forwardRef<
	BottomSheetModal,
	{ children: ReactNode; title?: string; accent?: boolean }
>(({ children, title, accent }, ref) => {
	const insets = useSafeAreaInsets();
	const reduced = useReducedMotion();
	const spring = useBottomSheetSpringConfigs(springs.gentle);
	const timing = useBottomSheetTimingConfigs({ duration: durations.base });
	return (
		<BottomSheetModal
			ref={ref}
			enableDynamicSizing
			animationConfigs={reduced ? timing : spring}
			backgroundComponent={SheetBackground}
			handleComponent={SheetHandle}
			backdropComponent={Backdrop}
		>
			<BottomSheetView
				style={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}
			>
				{accent ? (
					<Gradient
						borderRadius={999}
						style={{
							height: 3,
							width: 40,
							alignSelf: "center",
							marginBottom: 12,
						}}
					/>
				) : null}
				{title ? (
					<Text variant="large" className="pb-3" accessibilityRole="header">
						{title}
					</Text>
				) : null}
				{children}
			</BottomSheetView>
		</BottomSheetModal>
	);
});
Sheet.displayName = "Sheet";
