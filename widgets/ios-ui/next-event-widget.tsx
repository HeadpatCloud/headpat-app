import { Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
	containerBackground,
	font,
	foregroundStyle,
	frame,
	lineLimit,
	textCase,
	widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import type { NextEventWidgetProps } from "@/widgets/ios-ui/props";

// Serialized into the widget extension: it may only use its arguments and the
// Expo UI components and modifiers, never anything else from this file.
const NextEventWidget = (
	props: NextEventWidgetProps,
	environment: WidgetEnvironment,
) => {
	"widget";
	const c =
		environment.colorScheme === "dark" ? props.colors.dark : props.colors.light;
	const small = environment.widgetFamily === "systemSmall";
	return (
		<VStack
			alignment="leading"
			spacing={4}
			modifiers={[
				frame({ maxWidth: 10000, maxHeight: 10000, alignment: "topLeading" }),
				containerBackground(c.background, "widget"),
				widgetURL(props.url),
			]}
		>
			<Text
				modifiers={[
					font({ size: 11, weight: "bold" }),
					textCase("uppercase"),
					foregroundStyle(c.link),
					lineLimit(1),
				]}
			>
				{props.label}
			</Text>
			<Spacer />
			{props.title ? (
				<VStack alignment="leading" spacing={3}>
					<Text
						modifiers={[
							font({
								size: small ? 16 : 18,
								weight: "semibold",
								design: "rounded",
							}),
							foregroundStyle(c.foreground),
							lineLimit(small ? 3 : 2),
						]}
					>
						{props.title}
					</Text>
					<Text
						modifiers={[
							font({ size: 14, weight: "bold" }),
							foregroundStyle(c.link),
							lineLimit(1),
						]}
					>
						{props.time}
					</Text>
					{!small && props.where ? (
						<Text
							modifiers={[
								font({ size: 13 }),
								foregroundStyle(c.muted),
								lineLimit(1),
							]}
						>
							{props.where}
						</Text>
					) : null}
					{!small && props.community ? (
						<Text
							modifiers={[
								font({ size: 13 }),
								foregroundStyle(c.muted),
								lineLimit(1),
							]}
						>
							{props.community}
						</Text>
					) : null}
				</VStack>
			) : (
				<VStack alignment="leading" spacing={3}>
					<Text
						modifiers={[
							font({ size: 17, weight: "semibold", design: "rounded" }),
							foregroundStyle(c.foreground),
							lineLimit(2),
						]}
					>
						{props.emptyTitle}
					</Text>
					<Text
						modifiers={[
							font({ size: 13 }),
							foregroundStyle(c.muted),
							lineLimit(2),
						]}
					>
						{props.emptyHint}
					</Text>
				</VStack>
			)}
			<Spacer />
		</VStack>
	);
};

const EMPTY_PALETTE = {
	background: "#ffffff",
	foreground: "#163a2f",
	muted: "#4c6159",
	link: "#0b6b48",
	primary: "#0b6b48",
	primaryForeground: "#ffffff",
};

export default createWidget<NextEventWidgetProps>(
	"NextEvent",
	NextEventWidget,
	{
		colors: { light: EMPTY_PALETTE, dark: EMPTY_PALETTE },
		label: "Next event",
		url: "headpat://events",
		title: "",
		time: "",
		where: "",
		community: "",
		emptyTitle: "Open Headpat",
		emptyHint: "to load your next event",
	},
);
