// Props the iOS widgets render from. Widget layouts run in the widget
// extension's own JS runtime with no access to the app, so everything they
// show (translated text, colors, links) is computed in the app and passed in.

export interface IosPalette {
	background: string;
	foreground: string;
	muted: string;
	link: string;
	primary: string;
	primaryForeground: string;
}

/** Colors per system appearance; both are the same when the user forces one. */
export interface IosColors {
	light: IosPalette;
	dark: IosPalette;
}

export interface NextEventWidgetProps {
	colors: IosColors;
	label: string;
	url: string;
	/** null shows the empty state. */
	title: string | null;
	time: string;
	where: string | null;
	community: string | null;
	emptyTitle: string;
	emptyHint: string;
}

export interface ChatRow {
	title: string;
	text: string;
	unread: string;
	url: string;
}

export interface ChatsWidgetProps {
	colors: IosColors;
	label: string;
	url: string;
	signedIn: boolean;
	signInText: string;
	count: number;
	countLabel: string;
	messagesLabel: string;
	emptyTitle: string;
	emptyHint: string;
	rows: ChatRow[];
}
