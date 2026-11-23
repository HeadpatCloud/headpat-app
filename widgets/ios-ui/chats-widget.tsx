import { HStack, Link, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
	background,
	containerBackground,
	cornerRadius,
	font,
	foregroundStyle,
	frame,
	lineLimit,
	padding,
	textCase,
	widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import type { ChatsWidgetProps } from "@/widgets/ios-ui/props";

// Serialized into the widget extension: it may only use its arguments and the
// Expo UI components and modifiers, never anything else from this file.
const ChatsWidget = (
	props: ChatsWidgetProps,
	environment: WidgetEnvironment,
) => {
	"widget";
	const c =
		environment.colorScheme === "dark" ? props.colors.dark : props.colors.light;
	const family = environment.widgetFamily;
	// Small widgets can't hold rows, and only medium and up can link per row.
	const maxRows =
		family === "systemLarge" ? 5 : family === "systemMedium" ? 2 : 0;
	const rows =
		props.signedIn && props.count > 0 ? props.rows.slice(0, maxRows) : [];
	const label = (
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
	);
	const frameAll = frame({
		maxWidth: 10000,
		maxHeight: 10000,
		alignment: "topLeading",
	});

	if (!props.signedIn || props.count === 0) {
		return (
			<VStack
				alignment="leading"
				spacing={4}
				modifiers={[
					frameAll,
					containerBackground(c.background, "widget"),
					widgetURL(props.url),
				]}
			>
				{label}
				<Spacer />
				<Text
					modifiers={[
						font({ size: 17, weight: "semibold", design: "rounded" }),
						foregroundStyle(c.foreground),
						lineLimit(2),
					]}
				>
					{props.signedIn ? props.emptyTitle : props.signInText}
				</Text>
				{props.signedIn ? (
					<Text
						modifiers={[
							font({ size: 13 }),
							foregroundStyle(c.muted),
							lineLimit(2),
						]}
					>
						{props.emptyHint}
					</Text>
				) : null}
				<Spacer />
			</VStack>
		);
	}

	return (
		<VStack
			alignment="leading"
			spacing={6}
			modifiers={[
				frameAll,
				containerBackground(c.background, "widget"),
				widgetURL(props.url),
			]}
		>
			{label}
			<HStack spacing={10} alignment="center">
				<Text
					modifiers={[
						font({ size: 32, weight: "semibold", design: "rounded" }),
						foregroundStyle(c.link),
					]}
				>
					{String(props.count)}
				</Text>
				<VStack alignment="leading" spacing={1}>
					<Text
						modifiers={[
							font({ size: 14, weight: "bold" }),
							foregroundStyle(c.foreground),
							lineLimit(1),
						]}
					>
						{props.countLabel}
					</Text>
					<Text
						modifiers={[
							font({ size: 13 }),
							foregroundStyle(c.muted),
							lineLimit(1),
						]}
					>
						{props.messagesLabel}
					</Text>
				</VStack>
			</HStack>
			{rows.map((row) => (
				<Link key={row.url} destination={row.url}>
					<HStack spacing={8} alignment="center">
						<VStack alignment="leading" spacing={0}>
							<Text
								modifiers={[
									font({ size: 14, weight: "bold" }),
									foregroundStyle(c.foreground),
									lineLimit(1),
								]}
							>
								{row.title}
							</Text>
							<Text
								modifiers={[
									font({ size: 13 }),
									foregroundStyle(c.muted),
									lineLimit(1),
								]}
							>
								{row.text}
							</Text>
						</VStack>
						<Spacer />
						<Text
							modifiers={[
								font({ size: 12, weight: "bold" }),
								foregroundStyle(c.primaryForeground),
								padding({ horizontal: 7, vertical: 2 }),
								background(c.primary),
								cornerRadius(10),
							]}
						>
							{row.unread}
						</Text>
					</HStack>
				</Link>
			))}
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

export default createWidget<ChatsWidgetProps>("Chats", ChatsWidget, {
	colors: { light: EMPTY_PALETTE, dark: EMPTY_PALETTE },
	label: "Chats",
	url: "headpat://chat",
	signedIn: false,
	signInText: "Open Headpat to see your chats",
	count: 0,
	countLabel: "",
	messagesLabel: "",
	emptyTitle: "",
	emptyHint: "",
	rows: [],
});
