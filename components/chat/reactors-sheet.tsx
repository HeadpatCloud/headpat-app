import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { forwardRef, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { PersonRow, type PersonSummary } from "@/components/person-row";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { orpc } from "@/lib/orpc";
import { useTheme } from "@/lib/theme/provider";

type Props = {
	messageId: string | null;
	/** Tab to open on; null shows everyone. */
	emoji: string | null;
	onOpenProfile?: () => void;
};

// Who reacted with what, like the website's reactions dialog: an "All" tab and
// one tab per emoji.
export const ReactorsSheet = forwardRef<BottomSheetModal, Props>(
	function ReactorsSheet({ messageId, emoji, onOpenProfile }, ref) {
		const { t } = useI18n();
		const { colors } = useTheme();
		const [tab, setTab] = useState<string | null>(emoji);
		useEffect(() => setTab(emoji), [emoji]);
		const q = useQuery({
			...orpc.message.reactors.queryOptions({
				input: { messageId: messageId ?? "" },
			}),
			enabled: !!messageId,
		});
		const groups = q.data?.reactions ?? [];

		const people = useMemo(() => {
			const shown = tab ? groups.filter((g) => g.emoji === tab) : groups;
			const byUser = new Map<
				string,
				{ person: PersonSummary; emojis: string[] }
			>();
			for (const g of shown) {
				for (const u of g.users) {
					const cur = byUser.get(u.userId);
					if (cur) cur.emojis.push(g.emoji);
					else
						byUser.set(u.userId, {
							person: {
								userId: u.userId,
								profileUrl: u.profileUrl ?? u.userId,
								displayName: u.displayName,
								name: u.name,
								avatarFileId: u.avatarFileId,
							},
							emojis: [g.emoji],
						});
				}
			}
			return [...byUser.values()];
		}, [groups, tab]);

		const total = tab
			? (groups.find((g) => g.emoji === tab)?.count ?? 0)
			: (q.data?.distinctCount ?? 0);
		const hidden = Math.max(0, total - people.length);

		const tabs: { key: string | null; label: string; count: number }[] = [
			{
				key: null,
				label: t("chat.allReactions"),
				count: q.data?.distinctCount ?? 0,
			},
			...groups.map((g) => ({ key: g.emoji, label: g.emoji, count: g.count })),
		];

		return (
			<Sheet ref={ref} title={t("chat.reactionsTitle")}>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerClassName="gap-2 pb-3"
				>
					{tabs.map((tb) => {
						const selected = tab === tb.key;
						return (
							<Pressable
								key={tb.key ?? "all"}
								onPress={() => setTab(tb.key)}
								accessibilityRole="tab"
								accessibilityState={{ selected }}
								className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${selected ? "bg-primary/15 border-primary/40" : "bg-card border-border"}`}
							>
								<Text className={tb.key ? "text-base" : "text-sm font-bold"}>
									{tb.label}
								</Text>
								<Text
									className={`text-xs font-bold ${selected ? "text-link" : "text-muted-foreground"}`}
								>
									{tb.count}
								</Text>
							</Pressable>
						);
					})}
				</ScrollView>
				{q.isPending && messageId ? (
					<ActivityIndicator className="py-6" color={colors.primary} />
				) : (
					<ScrollView style={{ maxHeight: 360 }}>
						{people.map(({ person, emojis }) => (
							<PersonRow
								key={person.userId}
								person={person}
								onPress={(p) => {
									onOpenProfile?.();
									router.push(`/user/${p.profileUrl}`);
								}}
								trailing={
									tab ? null : (
										<Text className="text-lg">{emojis.join(" ")}</Text>
									)
								}
							/>
						))}
						{hidden > 0 ? (
							<View className="px-2 py-2">
								<Text className="text-muted-foreground text-xs font-semibold">
									{t("chat.moreReacted", { count: hidden })}
								</Text>
							</View>
						) : null}
					</ScrollView>
				)}
			</Sheet>
		);
	},
);
