import { FlexWidget, TextWidget } from "react-native-android-widget";
import { FONTS, Muted, WidgetFrame } from "@/widgets/android-ui/frame";
import type { WidgetSnapshot } from "@/widgets/data";
import { formatEventTime, type WidgetPalette, wt } from "@/widgets/look";

export function NextEventWidget({
	snapshot,
	palette,
	height,
}: {
	snapshot: WidgetSnapshot | null;
	palette: WidgetPalette;
	height: number;
}) {
	const ev = snapshot?.nextEvent;
	if (!ev) {
		return (
			<WidgetFrame
				palette={palette}
				uri="headpat://events"
				label={wt("event.label")}
			>
				<FlexWidget style={{ flex: 1, justifyContent: "center" }}>
					<TextWidget
						text={wt("event.none")}
						maxLines={2}
						style={{
							fontFamily: FONTS.display,
							fontSize: 17,
							color: palette.foreground,
						}}
					/>
					<Muted palette={palette} text={wt("event.browse")} />
				</FlexWidget>
			</WidgetFrame>
		);
	}

	const roomy = height >= 140;
	const where =
		ev.locationText ??
		(ev.locationZoneMethod === "virtual" ? wt("event.online") : null);
	return (
		<WidgetFrame
			palette={palette}
			uri={`headpat://event/${ev.id}`}
			label={ev.going ? wt("event.going") : wt("event.label")}
		>
			<FlexWidget
				style={{ flex: 1, justifyContent: "center", flexDirection: "column" }}
			>
				<TextWidget
					text={ev.title}
					maxLines={roomy ? 2 : 1}
					truncate="END"
					style={{
						fontFamily: FONTS.display,
						fontSize: 18,
						color: palette.foreground,
					}}
				/>
				<TextWidget
					text={formatEventTime(ev.startsAt)}
					maxLines={1}
					style={{
						fontFamily: FONTS.bold,
						fontSize: 14,
						color: palette.link,
						marginTop: 4,
					}}
				/>
				{roomy && where ? <Muted palette={palette} text={where} /> : null}
				{roomy && ev.communityName ? (
					<Muted palette={palette} text={ev.communityName} />
				) : null}
			</FlexWidget>
		</WidgetFrame>
	);
}
