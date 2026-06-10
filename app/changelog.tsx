import { useInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns/format";
import { StyleSheet, View } from "react-native";
import { PaginatedList } from "@/components/paginated-list";
import { Badge } from "@/components/ui/badge";
import { GlowCard } from "@/components/ui/card";
import { Gradient } from "@/components/ui/gradient";
import { GradientText } from "@/components/ui/gradient-text";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

function Section({
	label,
	marker,
	items,
}: {
	label: string;
	marker: string;
	items: string[];
}) {
	if (items.length === 0) return null;
	return (
		<View className="gap-1">
			<View className="flex-row items-center gap-1.5">
				<View className={cn("h-2 w-2 rounded-full", marker)} />
				<Text variant="caption">{label}</Text>
			</View>
			{items.map((item) => (
				<Text key={item} className="text-foreground text-sm">
					• {item}
				</Text>
			))}
		</View>
	);
}

export default function Changelog() {
	const { t } = useI18n();
	const query = useInfiniteQuery(
		orpc.changelog.list.infiniteOptions({
			input: (page: number) => ({ page, pageSize: 24 }),
			initialPageParam: 1,
			getNextPageParam: (last) =>
				last.page * last.pageSize < last.total ? last.page + 1 : undefined,
		}),
	);

	return (
		<PaginatedList
			query={query}
			keyExtractor={(c) => c.id}
			emptyTitle={t("changelog.empty")}
			ListHeaderComponent={
				<View className="gap-1 pb-4 pt-2">
					<GradientText className="text-4xl font-extrabold leading-10 tracking-tight">
						{t("changelog.heading")}
					</GradientText>
					<Text variant="muted">{t("changelog.subtitle")}</Text>
				</View>
			}
			renderItem={(c) => (
				<View className="flex-row">
					<View style={styles.gutter} pointerEvents="none">
						<Gradient
							style={styles.rail}
							start={{ x: 0, y: 0 }}
							end={{ x: 0, y: 1 }}
						/>
						<Gradient style={styles.node} borderRadius={5} />
					</View>
					<GlowCard accent="none" className="flex-1 gap-3 rounded-3xl p-4">
						<View className="flex-row items-center gap-2">
							<Text variant="large" className="flex-1">
								{c.title}
							</Text>
							{c.version ? <Badge variant="gradient">{c.version}</Badge> : null}
						</View>
						<Text variant="small" className="text-muted-foreground">
							{format(new Date(c.publishedAt ?? c.createdAt), "PP")}
						</Text>
						{c.description ? (
							<Text className="text-foreground text-sm">{c.description}</Text>
						) : null}
						<Section
							label={t("changelog.new")}
							marker="bg-primary"
							items={[...c.featuresApp, ...c.featuresWeb]}
						/>
						<Section
							label={t("changelog.improved")}
							marker="bg-accent"
							items={[...c.improvementsApp, ...c.improvementsWeb]}
						/>
						<Section
							label={t("changelog.fixed")}
							marker="bg-muted-foreground"
							items={[...c.bugfixesApp, ...c.bugfixesWeb]}
						/>
					</GlowCard>
				</View>
			)}
		/>
	);
}

const styles = StyleSheet.create({
	gutter: { width: 28 },
	// bottom -12 bridges the h-3 list separator so the rail reads continuous
	rail: {
		position: "absolute",
		top: 0,
		bottom: -12,
		left: 7,
		width: 2,
		opacity: 0.6,
	},
	node: { position: "absolute", top: 21, left: 3, width: 10, height: 10 },
});
