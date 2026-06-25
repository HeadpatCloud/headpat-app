// The 22 themeable tokens, matching the web app's theme.setActive contract so a
// theme created on web renders identically here. Values are bare HSL triplets
// ("H S% L%") consumed via Tailwind's `hsl(var(--token))`.
export const TOKEN_KEYS = [
	"background",
	"foreground",
	"muted",
	"muted-foreground",
	"popover",
	"popover-foreground",
	"card",
	"card-foreground",
	"border",
	"input",
	"primary",
	"primary-foreground",
	"secondary",
	"secondary-foreground",
	"accent",
	"accent-foreground",
	"destructive",
	"destructive-foreground",
	"ring",
	"sidebar",
	"sidebar-foreground",
	"sidebar-border",
] as const;

export type TokenKey = (typeof TOKEN_KEYS)[number];
export type TokenMap = Record<TokenKey, string>;

export const TOKEN_GROUPS: { label: string; keys: TokenKey[] }[] = [
	{ label: "Base", keys: ["background", "foreground"] },
	{
		label: "Surfaces",
		keys: [
			"card",
			"card-foreground",
			"popover",
			"popover-foreground",
			"muted",
			"muted-foreground",
		],
	},
	{
		label: "Brand",
		keys: [
			"primary",
			"primary-foreground",
			"secondary",
			"secondary-foreground",
			"accent",
			"accent-foreground",
		],
	},
	{
		label: "Semantic",
		keys: ["border", "input", "ring", "destructive", "destructive-foreground"],
	},
	{
		label: "Sidebar",
		keys: ["sidebar", "sidebar-foreground", "sidebar-border"],
	},
];
