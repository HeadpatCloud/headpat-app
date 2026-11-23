import {
	BottomSheetFlatList,
	type BottomSheetFlatListMethods,
	BottomSheetModal,
	BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import {
	forwardRef,
	memo,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Clock, Search } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import {
	SheetBackdrop,
	SheetBackground,
	SheetHandle,
} from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { kvGet, kvSet } from "@/lib/db/kv";
import {
	type Emoji,
	emojiSet,
	SKIN_TONES,
	type SkinTone,
	searchEmoji,
	withSkinTone,
} from "@/lib/emoji";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

const SKIN_KEY = "hp-emoji-skin-tone";
const RECENT_KEY = "hp-emoji-recent";
const RECENT_MAX = 24;
const COLUMNS = 8;
const HEADER_H = 34;
const SIDE = 12;
const SNAPS = ["65%", "92%"];
const TONE_SAMPLE: Emoji = {
	emoji: "✋",
	label: "",
	search: "",
	skins: ["✋🏻", "✋🏼", "✋🏽", "✋🏾", "✋🏿"],
};
// One recognisable emoji per category for the tab bar, by emojibase group.
const GROUP_ICON: Record<number, string> = {
	0: "😀",
	1: "👋",
	3: "🐶",
	4: "🍎",
	5: "✈️",
	6: "⚽",
	7: "💡",
	8: "❤️",
	9: "🏳️",
};

type Row =
	| { kind: "header"; key: string; label: string; section: number }
	| { kind: "emojis"; key: string; emojis: Emoji[]; section: number };

function readRecent(): string[] {
	try {
		const v = JSON.parse(kvGet(RECENT_KEY) ?? "[]");
		return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
	} catch {
		return [];
	}
}

function readTone(): SkinTone {
	const v = kvGet(SKIN_KEY);
	return SKIN_TONES.find((t) => t === v) ?? "none";
}

function chunk(list: Emoji[], size: number): Emoji[][] {
	const out: Emoji[][] = [];
	for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
	return out;
}

const EmojiCell = memo(function EmojiCell({
	emoji,
	label,
	size,
	onPick,
}: {
	emoji: string;
	label: string;
	size: number;
	onPick: (emoji: string) => void;
}) {
	return (
		<Pressable
			onPress={() => onPick(emoji)}
			accessibilityRole="button"
			accessibilityLabel={label || emoji}
			className="active:bg-muted items-center justify-center rounded-xl"
			style={{ width: size, height: size }}
		>
			<Text style={{ fontSize: size * 0.62, lineHeight: size * 0.8 }}>
				{emoji}
			</Text>
		</Pressable>
	);
});

type Props = {
	/** Called with the picked emoji (in the chosen skin tone). */
	onSelect: (emoji: string) => void;
};

// The full emoji picker, like the website's: search in the app language,
// categories, skin tones, plus the emoji you used last.
export const EmojiPickerSheet = forwardRef<BottomSheetModal, Props>(
	function EmojiPickerSheet({ onSelect }, ref) {
		const { t, locale } = useI18n();
		const { colors } = useTheme();
		const insets = useSafeAreaInsets();
		const { width } = useWindowDimensions();
		const list = useRef<BottomSheetFlatListMethods>(null);
		const [query, setQuery] = useState("");
		const [tone, setTone] = useState<SkinTone>(readTone);
		const [recent, setRecent] = useState<string[]>(readRecent);
		const [active, setActive] = useState(0);
		const cell = Math.floor((width - SIDE * 2) / COLUMNS);
		// FlatList refuses a new callback after mount, so this one stays put.
		const onViewable = useRef(
			({ viewableItems }: { viewableItems: { item: Row }[] }) => {
				const first = viewableItems[0]?.item;
				if (first) setActive(first.section);
			},
		).current;
		const set = useMemo(() => emojiSet(locale), [locale]);

		const sections = useMemo(() => {
			const out: { label: string; icon: string | null; emojis: Emoji[] }[] = [];
			if (recent.length) {
				out.push({
					label: t("chat.emojiRecent"),
					icon: null,
					emojis: recent.map((emoji) => ({ emoji, label: "", search: "" })),
				});
			}
			for (const c of set.categories) {
				out.push({
					label: c.label,
					icon: GROUP_ICON[c.group] ?? c.emojis[0]?.emoji ?? "",
					emojis: c.emojis,
				});
			}
			return out;
		}, [set, recent, t]);

		const rows = useMemo<Row[]>(() => {
			if (query.trim()) {
				return chunk(searchEmoji(set, query), COLUMNS).map((emojis, i) => ({
					kind: "emojis",
					key: `q${i}`,
					emojis,
					section: 0,
				}));
			}
			const out: Row[] = [];
			sections.forEach((s, section) => {
				out.push({
					kind: "header",
					key: `h${section}`,
					label: s.label,
					section,
				});
				chunk(s.emojis, COLUMNS).forEach((emojis, i) => {
					out.push({ kind: "emojis", key: `${section}-${i}`, emojis, section });
				});
			});
			return out;
		}, [sections, set, query]);

		// Fixed heights make jumping to a category exact and cheap.
		const offsets = useMemo(() => {
			let y = 0;
			return rows.map((r) => {
				const at = y;
				y += r.kind === "header" ? HEADER_H : cell;
				return at;
			});
		}, [rows, cell]);

		const pick = useCallback(
			(emoji: string) => {
				setRecent((cur) => {
					const next = [emoji, ...cur.filter((e) => e !== emoji)].slice(
						0,
						RECENT_MAX,
					);
					kvSet(RECENT_KEY, JSON.stringify(next));
					return next;
				});
				onSelect(emoji);
			},
			[onSelect],
		);

		const cycleTone = () => {
			const next =
				SKIN_TONES[(SKIN_TONES.indexOf(tone) + 1) % SKIN_TONES.length];
			setTone(next);
			kvSet(SKIN_KEY, next);
		};

		const jumpTo = (section: number) => {
			const index = rows.findIndex(
				(r) => r.kind === "header" && r.section === section,
			);
			if (index < 0) return;
			setActive(section);
			list.current?.scrollToOffset({ offset: offsets[index], animated: false });
		};

		const toneLabel = set.skinToneLabels[SKIN_TONES.indexOf(tone)];

		return (
			<BottomSheetModal
				ref={ref}
				snapPoints={SNAPS}
				enableDynamicSizing={false}
				android_keyboardInputMode="adjustResize"
				keyboardBehavior="extend"
				keyboardBlurBehavior="restore"
				backgroundComponent={SheetBackground}
				handleComponent={SheetHandle}
				backdropComponent={SheetBackdrop}
				onDismiss={() => setQuery("")}
			>
				<View style={{ paddingHorizontal: SIDE }} className="gap-2 pb-2">
					<View className="flex-row items-center gap-2">
						<View className="bg-muted h-11 flex-1 flex-row items-center gap-2 rounded-2xl px-3">
							<Icon as={Search} size={16} className="text-muted-foreground" />
							<BottomSheetTextInput
								value={query}
								onChangeText={setQuery}
								placeholder={t("chat.emojiSearch")}
								placeholderTextColor={colors["muted-foreground"]}
								autoCorrect={false}
								autoCapitalize="none"
								returnKeyType="search"
								accessibilityLabel={t("chat.emojiSearch")}
								className="text-foreground font-sans h-11 flex-1 text-base"
							/>
						</View>
						<Pressable
							onPress={cycleTone}
							accessibilityRole="button"
							accessibilityLabel={
								toneLabel
									? `${t("chat.emojiSkinTone")}: ${toneLabel}`
									: t("chat.emojiSkinTone")
							}
							className="bg-muted active:opacity-70 h-11 w-11 items-center justify-center rounded-2xl"
						>
							<Text className="text-2xl">
								{withSkinTone(TONE_SAMPLE, tone)}
							</Text>
						</Pressable>
					</View>
					{query.trim() ? null : (
						<View className="flex-row justify-between">
							{sections.map((s, i) => (
								<Pressable
									key={s.label}
									onPress={() => jumpTo(i)}
									accessibilityRole="tab"
									accessibilityLabel={s.label}
									accessibilityState={{ selected: active === i }}
									hitSlop={4}
									className={`h-9 w-9 items-center justify-center rounded-xl ${active === i ? "bg-primary/15" : ""}`}
								>
									{s.icon ? (
										<Text className="text-lg">{s.icon}</Text>
									) : (
										<Icon
											as={Clock}
											size={18}
											className="text-muted-foreground"
										/>
									)}
								</Pressable>
							))}
						</View>
					)}
				</View>
				<BottomSheetFlatList
					ref={list}
					data={rows}
					keyExtractor={(r: Row) => r.key}
					getItemLayout={(_: unknown, index: number) => ({
						length: rows[index]?.kind === "header" ? HEADER_H : cell,
						offset: offsets[index] ?? 0,
						index,
					})}
					initialNumToRender={14}
					maxToRenderPerBatch={12}
					windowSize={7}
					keyboardShouldPersistTaps="handled"
					contentContainerStyle={{
						paddingHorizontal: SIDE,
						paddingBottom: insets.bottom + 16,
					}}
					onViewableItemsChanged={onViewable}
					ListEmptyComponent={
						<Text className="text-muted-foreground py-8 text-center font-semibold">
							{t("chat.emojiNone")}
						</Text>
					}
					renderItem={({ item }: { item: Row }) =>
						item.kind === "header" ? (
							<View style={{ height: HEADER_H }} className="justify-end pb-1.5">
								<Text className="text-muted-foreground text-xs font-bold uppercase">
									{item.label}
								</Text>
							</View>
						) : (
							<View className="flex-row" style={{ height: cell }}>
								{item.emojis.map((e) => {
									const glyph = withSkinTone(e, tone);
									return (
										<EmojiCell
											key={e.emoji}
											emoji={glyph}
											label={e.label}
											size={cell}
											onPick={pick}
										/>
									);
								})}
							</View>
						)
					}
				/>
			</BottomSheetModal>
		);
	},
);
