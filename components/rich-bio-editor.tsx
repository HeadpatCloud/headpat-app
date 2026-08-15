import { useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	TextInput,
	View,
} from "react-native";
import {
	Bold,
	Heading2,
	Heading3,
	ImagePlus,
	Italic,
	Link2,
	List,
	ListOrdered,
	type LucideIcon,
	Minus,
	Quote,
	SquareMousePointer,
	Strikethrough,
	Type,
	Underline,
} from "@/components/icons";
import { RichBioBlocks } from "@/components/rich-bio";
import {
	isEditableText,
	RichBioBlockEditor,
} from "@/components/rich-bio-block";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { Text } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { useI18n } from "@/lib/i18n/provider";
import { humanizeError } from "@/lib/orpc-error";
import { parseBioHtml } from "@/lib/rich-bio/parse";
import {
	activeMarks,
	applyLink,
	applyMark,
	linkAt,
	runsToText,
} from "@/lib/rich-bio/runs";
import { serializeBio } from "@/lib/rich-bio/serialize";
import type {
	Block,
	ListBlockType,
	Mark,
	Run,
	TextBlockType,
} from "@/lib/rich-bio/types";
import { useTheme } from "@/lib/theme/provider";
import { pickImage, uploadBioImage } from "@/lib/upload";
import { cn } from "@/lib/utils";

type EditorBlock = { id: string; block: Block };

type Focus = { id: string; item?: number };

const MARK_ICONS: { mark: Mark; icon: LucideIcon; label: string }[] = [
	{ mark: "b", icon: Bold, label: "richBio.bold" },
	{ mark: "i", icon: Italic, label: "richBio.italic" },
	{ mark: "u", icon: Underline, label: "richBio.underline" },
	{ mark: "s", icon: Strikethrough, label: "richBio.strikethrough" },
];

const BLOCK_TYPES: {
	type: TextBlockType | ListBlockType;
	icon: LucideIcon;
	label: string;
}[] = [
	{ type: "p", icon: Type, label: "richBio.addText" },
	{ type: "h2", icon: Heading2, label: "richBio.addHeading" },
	{ type: "h3", icon: Heading3, label: "richBio.addSubheading" },
	{ type: "ul", icon: List, label: "richBio.addBullets" },
	{ type: "ol", icon: ListOrdered, label: "richBio.addNumbers" },
	{ type: "quote", icon: Quote, label: "richBio.addQuote" },
];

function runsOf(block: Block, item?: number): Run[] {
	if (block.type === "ul" || block.type === "ol") {
		return block.items[item ?? 0] ?? [];
	}
	if (
		block.type === "p" ||
		block.type === "h2" ||
		block.type === "h3" ||
		block.type === "quote"
	) {
		return block.runs;
	}
	return [];
}

function ToolbarButton({
	icon,
	label,
	active,
	disabled,
	onPress,
}: {
	icon: LucideIcon;
	label: string;
	active?: boolean;
	disabled?: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ selected: !!active, disabled: !!disabled }}
			className={cn(
				"h-10 w-10 items-center justify-center rounded-xl",
				active ? "bg-primary" : "active:bg-accent",
				disabled && "opacity-30",
			)}
		>
			<Icon
				as={icon}
				size={16}
				className={active ? "text-primary-foreground" : "text-foreground"}
			/>
		</Pressable>
	);
}

function AddChip({
	icon,
	label,
	onPress,
	busy,
}: {
	icon: LucideIcon;
	label: string;
	onPress: () => void;
	busy?: boolean;
}) {
	return (
		<Pressable
			onPress={onPress}
			disabled={busy}
			accessibilityRole="button"
			accessibilityLabel={label}
			className="border-border bg-background h-10 flex-row items-center gap-1.5 rounded-xl border px-3 active:opacity-70"
		>
			{busy ? (
				<ActivityIndicator size="small" />
			) : (
				<Icon as={icon} size={14} className="text-muted-foreground" />
			)}
			<Text variant="small" className="text-foreground">
				{label}
			</Text>
		</Pressable>
	);
}

export function RichBioEditor({
	initialHtml,
	onChange,
	onUploadingChange,
}: {
	initialHtml: string;
	onChange: (html: string) => void;
	onUploadingChange?: (uploading: boolean) => void;
}) {
	const { t } = useI18n();
	const { colors } = useTheme();
	const nextId = useRef(0);
	const makeId = () => `block-${nextId.current++}`;

	const [blocks, setBlocks] = useState<EditorBlock[]>(() =>
		parseBioHtml(initialHtml).map((block) => ({ id: makeId(), block })),
	);
	const [focus, setFocus] = useState<Focus | null>(null);
	const [selection, setSelection] = useState({ start: 0, end: 0 });
	const [linkOpen, setLinkOpen] = useState(false);
	const [linkUrl, setLinkUrl] = useState("");
	const [linkCta, setLinkCta] = useState(false);
	const [uploading, setUploading] = useState(false);

	const apply = (next: EditorBlock[]) => {
		setBlocks(next);
		onChange(serializeBio(next.map((entry) => entry.block)));
	};

	const focused = blocks.find((entry) => entry.id === focus?.id) ?? null;
	const canFormat = !!focused && isEditableText(focused.block);
	const currentRuns = focused ? runsOf(focused.block, focus?.item) : [];

	// A collapsed caret formats the whole block: selecting text precisely is
	// fiddly on touch, and "format what I'm in" is the useful default.
	const range = (): [number, number] => {
		if (selection.end > selection.start)
			return [selection.start, selection.end];
		return [0, runsToText(currentRuns).length];
	};

	const updateRuns = (fn: (runs: Run[]) => Run[]) => {
		if (!focus) return;
		apply(
			blocks.map((entry) => {
				if (entry.id !== focus.id) return entry;
				const block = entry.block;
				if (block.type === "ul" || block.type === "ol") {
					const index = focus.item ?? 0;
					return {
						...entry,
						block: {
							...block,
							items: block.items.map((item, i) =>
								i === index ? fn(item) : item,
							),
						},
					};
				}
				if (
					block.type === "p" ||
					block.type === "h2" ||
					block.type === "h3" ||
					block.type === "quote"
				) {
					return { ...entry, block: { ...block, runs: fn(block.runs) } };
				}
				return entry;
			}),
		);
	};

	// Switching a block's type keeps its text: list items become one paragraph
	// separated by line breaks, and a paragraph becomes a single item.
	const convert = (type: TextBlockType | ListBlockType) => {
		if (!focused) return;
		const block = focused.block;
		const items =
			block.type === "ul" || block.type === "ol"
				? block.items
				: [runsOf(block)];
		const next: Block =
			type === "ul" || type === "ol"
				? { type, items }
				: {
						type,
						runs: items.flatMap((runs, i) =>
							i ? [{ text: "\n" }, ...runs] : runs,
						),
					};
		apply(
			blocks.map((entry) =>
				entry.id === focused.id ? { ...entry, block: next } : entry,
			),
		);
	};

	const insert = (block: Block) => {
		const entry = { id: makeId(), block };
		const at = focused
			? blocks.findIndex((b) => b.id === focused.id) + 1
			: blocks.length;
		apply([...blocks.slice(0, at), entry, ...blocks.slice(at)]);
		setFocus({ id: entry.id });
		setSelection({ start: 0, end: 0 });
	};

	const addImage = async () => {
		const asset = await pickImage();
		if (!asset) return;
		setUploading(true);
		onUploadingChange?.(true);
		try {
			insert({ type: "img", src: await uploadBioImage(asset) });
		} catch (e) {
			Alert.alert(t("richBio.uploadFailed"), humanizeError(e));
		} finally {
			setUploading(false);
			onUploadingChange?.(false);
		}
	};

	const openLinkPanel = () => {
		const [start, end] = range();
		const existing = linkAt(currentRuns, start, end);
		setLinkUrl(existing?.href ?? "https://");
		setLinkCta(existing?.cta ?? false);
		setLinkOpen(true);
	};

	const submitLink = () => {
		const [start, end] = range();
		const url = linkUrl.trim();
		const href = url && !/^https?:\/\/$/i.test(url) ? url : null;
		updateRuns((runs) => applyLink(runs, start, end, href, linkCta));
		setLinkOpen(false);
	};

	const marks = canFormat ? activeMarks(currentRuns, ...range()) : [];

	return (
		<View className="gap-3">
			<View className="border-border bg-card flex-row flex-wrap items-center gap-1 rounded-2xl border p-1">
				{MARK_ICONS.map(({ mark, icon, label }) => (
					<ToolbarButton
						key={mark}
						icon={icon}
						label={t(label)}
						active={marks.includes(mark)}
						disabled={!canFormat}
						onPress={() =>
							updateRuns((runs) =>
								applyMark(runs, ...range(), mark, !marks.includes(mark)),
							)
						}
					/>
				))}
				<View className="bg-border mx-1 h-5 w-px" />
				<ToolbarButton
					icon={Link2}
					label={t("richBio.link")}
					active={!!linkAt(currentRuns, ...range())}
					disabled={!canFormat}
					onPress={openLinkPanel}
				/>
				<View className="bg-border mx-1 h-5 w-px" />
				{BLOCK_TYPES.map(({ type, icon, label }) => (
					<ToolbarButton
						key={type}
						icon={icon}
						label={t(label)}
						active={focused?.block.type === type}
						disabled={!canFormat}
						onPress={() => convert(type)}
					/>
				))}
			</View>

			{linkOpen ? (
				<Card className="gap-3 rounded-2xl p-3">
					<TextInput
						value={linkUrl}
						onChangeText={setLinkUrl}
						placeholder={t("richBio.linkUrl")}
						placeholderTextColor={colors["muted-foreground"]}
						autoCapitalize="none"
						autoCorrect={false}
						keyboardType="url"
						className="border-input bg-background text-foreground h-11 rounded-xl border px-3"
					/>
					<View className="min-h-11 flex-row items-center justify-between">
						<Text className="text-foreground flex-1">
							{t("richBio.asButton")}
						</Text>
						<Toggle
							value={linkCta}
							onValueChange={setLinkCta}
							accessibilityLabel={t("richBio.asButton")}
						/>
					</View>
					<View className="flex-row gap-2">
						<Button size="sm" onPress={submitLink} className="flex-1">
							<Text>{t("richBio.applyLink")}</Text>
						</Button>
						<Button
							size="sm"
							variant="ghost"
							onPress={() => setLinkOpen(false)}
							className="flex-1"
						>
							<Text>{t("common.cancel")}</Text>
						</Button>
					</View>
				</Card>
			) : null}

			{blocks.length ? (
				<View className="gap-2">
					{blocks.map((entry, i) => (
						<RichBioBlockEditor
							key={entry.id}
							block={entry.block}
							focused={focus?.id === entry.id}
							canMoveUp={i > 0}
							canMoveDown={i < blocks.length - 1}
							onChange={(block) =>
								apply(
									blocks.map((b) => (b.id === entry.id ? { ...b, block } : b)),
								)
							}
							onFocusRuns={(item) => {
								setFocus({ id: entry.id, item });
								setLinkOpen(false);
							}}
							onSelection={setSelection}
							onMove={(delta) => {
								const next = [...blocks];
								const [moved] = next.splice(i, 1);
								next.splice(i + delta, 0, moved);
								apply(next);
							}}
							onRemove={() => {
								apply(blocks.filter((b) => b.id !== entry.id));
								if (focus?.id === entry.id) setFocus(null);
							}}
						/>
					))}
				</View>
			) : (
				<Text variant="muted">{t("richBio.empty")}</Text>
			)}

			<KeyboardAwareScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{ gap: 8 }}
			>
				<AddChip
					icon={Type}
					label={t("richBio.addText")}
					onPress={() => insert({ type: "p", runs: [] })}
				/>
				<AddChip
					icon={Heading2}
					label={t("richBio.addHeading")}
					onPress={() => insert({ type: "h2", runs: [] })}
				/>
				<AddChip
					icon={Heading3}
					label={t("richBio.addSubheading")}
					onPress={() => insert({ type: "h3", runs: [] })}
				/>
				<AddChip
					icon={SquareMousePointer}
					label={t("richBio.addButton")}
					onPress={() =>
						insert({
							type: "p",
							runs: [
								{
									text: t("richBio.buttonDefault"),
									href: "https://",
									cta: true,
								},
							],
						})
					}
				/>
				<AddChip
					icon={List}
					label={t("richBio.addBullets")}
					onPress={() => insert({ type: "ul", items: [[]] })}
				/>
				<AddChip
					icon={ListOrdered}
					label={t("richBio.addNumbers")}
					onPress={() => insert({ type: "ol", items: [[]] })}
				/>
				<AddChip
					icon={Quote}
					label={t("richBio.addQuote")}
					onPress={() => insert({ type: "quote", runs: [] })}
				/>
				<AddChip
					icon={ImagePlus}
					label={t("richBio.addImage")}
					busy={uploading}
					onPress={addImage}
				/>
				<AddChip
					icon={Minus}
					label={t("richBio.addDivider")}
					onPress={() => insert({ type: "hr" })}
				/>
			</KeyboardAwareScrollView>

			{blocks.length ? (
				<View className="gap-2">
					<Text variant="caption">{t("richBio.preview")}</Text>
					<Card className="rounded-2xl p-3">
						<RichBioBlocks blocks={blocks.map((entry) => entry.block)} />
					</Card>
				</View>
			) : null}
		</View>
	);
}
