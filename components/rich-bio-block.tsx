import { Pressable, TextInput, View } from "react-native";
import {
	ChevronDown,
	ChevronUp,
	type LucideIcon,
	Plus,
	Trash2,
} from "@/components/icons";
import { bioImageUri } from "@/components/rich-bio";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { replaceText, runsToText } from "@/lib/rich-bio/runs";
import type { Block, TextBlockType } from "@/lib/rich-bio/types";
import { useTheme } from "@/lib/theme/provider";
import { cn } from "@/lib/utils";
import { Image } from "expo-image";

const TEXT_CLASS: Record<TextBlockType, string> = {
	p: "text-foreground text-base leading-6",
	h2: "text-foreground text-xl font-bold",
	h3: "text-foreground text-lg font-semibold",
	quote: "text-muted-foreground text-base italic leading-6",
};

const PLACEHOLDER: Record<TextBlockType, string> = {
	p: "richBio.placeholderText",
	h2: "richBio.placeholderHeading",
	h3: "richBio.placeholderSubheading",
	quote: "richBio.placeholderQuote",
};

/** A paragraph holding a single CTA link — the "button" users add. */
export function isCtaBlock(block: Block): boolean {
	return block.type === "p" && block.runs.length === 1 && !!block.runs[0]?.cta;
}

export function isEditableText(block: Block): boolean {
	if (isCtaBlock(block)) return false;
	return (
		block.type === "p" ||
		block.type === "h2" ||
		block.type === "h3" ||
		block.type === "quote" ||
		block.type === "ul" ||
		block.type === "ol"
	);
}

function IconButton({
	icon,
	label,
	onPress,
	disabled,
	destructive,
}: {
	icon: LucideIcon;
	label: string;
	onPress: () => void;
	disabled?: boolean;
	destructive?: boolean;
}) {
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityLabel={label}
			className={cn(
				"h-9 w-9 items-center justify-center rounded-xl",
				"active:bg-accent",
				disabled && "opacity-30",
			)}
		>
			<Icon
				as={icon}
				size={16}
				className={destructive ? "text-destructive" : "text-muted-foreground"}
			/>
		</Pressable>
	);
}

type Props = {
	block: Block;
	focused: boolean;
	canMoveUp: boolean;
	canMoveDown: boolean;
	onChange: (block: Block) => void;
	onFocusRuns: (item?: number) => void;
	onSelection: (selection: { start: number; end: number }) => void;
	onMove: (delta: -1 | 1) => void;
	onRemove: () => void;
};

export function RichBioBlockEditor({
	block,
	focused,
	canMoveUp,
	canMoveDown,
	onChange,
	onFocusRuns,
	onSelection,
	onMove,
	onRemove,
}: Props) {
	const { t } = useI18n();
	const { colors } = useTheme();

	const textInput = (
		value: string,
		onChangeText: (text: string) => void,
		className: string,
		placeholder: string,
		item?: number,
	) => (
		<TextInput
			value={value}
			onChangeText={onChangeText}
			onFocus={() => onFocusRuns(item)}
			onSelectionChange={(e) => onSelection(e.nativeEvent.selection)}
			placeholder={placeholder}
			placeholderTextColor={colors["muted-foreground"]}
			multiline
			className={cn("min-h-11 flex-1 px-1 py-2", className)}
		/>
	);

	let content: React.ReactNode = null;

	if (isCtaBlock(block) && block.type === "p") {
		const run = block.runs[0];
		content = (
			<View className="gap-2">
				<Text variant="caption">{t("richBio.buttonBlock")}</Text>
				<TextInput
					value={run.text}
					onChangeText={(text) =>
						onChange({ type: "p", runs: [{ ...run, text }] })
					}
					onFocus={() => onFocusRuns()}
					placeholder={t("richBio.buttonLabel")}
					placeholderTextColor={colors["muted-foreground"]}
					className="border-input bg-background text-foreground h-11 rounded-xl border px-3"
				/>
				<TextInput
					value={run.href ?? ""}
					onChangeText={(href) =>
						onChange({ type: "p", runs: [{ ...run, href }] })
					}
					onFocus={() => onFocusRuns()}
					placeholder={t("richBio.linkUrl")}
					placeholderTextColor={colors["muted-foreground"]}
					autoCapitalize="none"
					autoCorrect={false}
					keyboardType="url"
					className="border-input bg-background text-muted-foreground h-11 rounded-xl border px-3 text-sm"
				/>
			</View>
		);
	} else if (
		block.type === "p" ||
		block.type === "h2" ||
		block.type === "h3" ||
		block.type === "quote"
	) {
		content = textInput(
			runsToText(block.runs),
			(text) => onChange({ ...block, runs: replaceText(block.runs, text) }),
			TEXT_CLASS[block.type],
			t(PLACEHOLDER[block.type]),
		);
	} else if (block.type === "ul" || block.type === "ol") {
		content = (
			<View className="gap-1">
				{block.items.map((runs, i) => (
					<View key={i} className="flex-row items-center gap-1">
						<Text className="text-muted-foreground w-6 text-center">
							{block.type === "ol" ? `${i + 1}.` : "•"}
						</Text>
						{textInput(
							runsToText(runs),
							(text) =>
								onChange({
									...block,
									items: block.items.map((it, j) =>
										j === i ? replaceText(it, text) : it,
									),
								}),
							TEXT_CLASS.p,
							t("richBio.placeholderListItem"),
							i,
						)}
						<IconButton
							icon={Trash2}
							label={t("richBio.removeItem")}
							disabled={block.items.length < 2}
							onPress={() =>
								onChange({
									...block,
									items: block.items.filter((_, j) => j !== i),
								})
							}
						/>
					</View>
				))}
				<Pressable
					onPress={() => onChange({ ...block, items: [...block.items, []] })}
					accessibilityRole="button"
					accessibilityLabel={t("richBio.addListItem")}
					className="flex-row items-center gap-1.5 self-start rounded-xl px-1 py-2 active:opacity-70"
				>
					<Icon as={Plus} size={14} className="text-muted-foreground" />
					<Text variant="small" className="text-muted-foreground">
						{t("richBio.addListItem")}
					</Text>
				</Pressable>
			</View>
		);
	} else if (block.type === "img") {
		content = (
			<Image
				source={{ uri: bioImageUri(block.src) }}
				contentFit="cover"
				className="bg-muted h-32 w-full rounded-xl"
			/>
		);
	} else if (block.type === "hr") {
		content = (
			<View className="gap-2 py-2">
				<View className="border-border border-t" />
				<Text variant="caption">{t("richBio.dividerBlock")}</Text>
			</View>
		);
	} else {
		content = (
			<Text variant="muted">
				{block.type === "table"
					? t("richBio.tableWebOnly")
					: t("richBio.unsupported")}
			</Text>
		);
	}

	return (
		<View
			className={cn(
				"border-border bg-card rounded-2xl border p-2",
				focused && "border-primary",
			)}
		>
			<View className="flex-row items-start gap-1">
				<View className="flex-1">{content}</View>
				<View className="gap-0.5">
					<IconButton
						icon={ChevronUp}
						label={t("richBio.moveUp")}
						disabled={!canMoveUp}
						onPress={() => onMove(-1)}
					/>
					<IconButton
						icon={ChevronDown}
						label={t("richBio.moveDown")}
						disabled={!canMoveDown}
						onPress={() => onMove(1)}
					/>
					<IconButton
						icon={Trash2}
						label={t("richBio.remove")}
						destructive
						onPress={onRemove}
					/>
				</View>
			</View>
		</View>
	);
}
