import type { ReactNode } from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { WidgetPalette } from "@/widgets/look";

export const FONTS = {
	display: "Fredoka_600SemiBold",
	body: "Nunito_400Regular",
	bold: "Nunito_700Bold",
} as const;

/** The rounded card every widget sits in; tapping it opens `uri`. */
export function WidgetFrame({
	palette,
	uri,
	label,
	children,
}: {
	palette: WidgetPalette;
	uri: string;
	label: string;
	children: ReactNode;
}) {
	return (
		<FlexWidget
			clickAction="OPEN_URI"
			clickActionData={{ uri }}
			accessibilityLabel={label}
			style={{
				height: "match_parent",
				width: "match_parent",
				flexDirection: "column",
				backgroundColor: palette.background,
				borderRadius: 24,
				padding: 16,
			}}
		>
			<TextWidget
				text={label.toUpperCase()}
				maxLines={1}
				truncate="END"
				style={{
					fontFamily: FONTS.bold,
					fontSize: 11,
					letterSpacing: 0.08,
					color: palette.link,
				}}
			/>
			{children}
		</FlexWidget>
	);
}

export function Muted({
	palette,
	text,
	lines = 1,
}: {
	palette: WidgetPalette;
	text: string;
	lines?: number;
}) {
	return (
		<TextWidget
			text={text}
			maxLines={lines}
			truncate="END"
			style={{
				fontFamily: FONTS.body,
				fontSize: 13,
				color: palette.mutedForeground,
			}}
		/>
	);
}
