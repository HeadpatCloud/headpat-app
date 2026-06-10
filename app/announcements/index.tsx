import { useInfiniteQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { GlowBackdrop } from "@/components/brand/glow-backdrop";
import { PaginatedList } from "@/components/paginated-list";
import { GlowCard } from "@/components/ui/card";
import { Gradient } from "@/components/ui/gradient";
import { GradientText } from "@/components/ui/gradient-text";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { orpc } from "@/lib/orpc";

export default function Announcements() {
	const { t } = useI18n();
	const query = useInfiniteQuery(
		orpc.announcement.list.infiniteOptions({
			input: (page: number) => ({ page, pageSize: 24 }),
			initialPageParam: 1,
			getNextPageParam: (last) =>
				last.page * last.pageSize < last.total ? last.page + 1 : undefined,
		}),
	);

	return (
		<PaginatedList
			query={query}
			keyExtractor={(a) => a.id}
			emptyTitle={t("announcements.empty")}
			ListHeaderComponent={
				<View className="gap-1 pb-4 pt-2">
					<GlowBackdrop size={220} style={styles.bloom} />
					<GradientText className="text-4xl font-extrabold leading-10 tracking-tight">
						{t("announcements.heading")}
					</GradientText>
					<Text variant="muted">{t("announcements.subtitle")}</Text>
				</View>
			}
			renderItem={(a) => (
				<PressableScale
					onPress={() => router.push(`/announcements/${a.id}`)}
					haptic="selection"
					accessibilityRole="button"
					accessibilityLabel={a.title ?? undefined}
				>
					<GlowCard accent="none" className="gap-1.5 rounded-3xl p-4 pl-5">
						<Gradient
							style={styles.spine}
							start={{ x: 0, y: 0 }}
							end={{ x: 0, y: 1 }}
							pointerEvents="none"
						/>
						<Text variant="large">{a.title}</Text>
						{a.sideText ? <Text variant="muted">{a.sideText}</Text> : null}
						<Text variant="small" className="text-muted-foreground">
							{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
						</Text>
					</GlowCard>
				</PressableScale>
			)}
		/>
	);
}

const styles = StyleSheet.create({
	bloom: { position: "absolute", top: -70, left: -60 },
	spine: { position: "absolute", top: 0, bottom: 0, left: 0, width: 3 },
});
