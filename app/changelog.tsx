import { useInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns/format";
import { View } from "react-native";
import { Bug, type LucideIcon, Sparkles, TrendingUp } from "@/components/icons";
import { PaginatedList } from "@/components/paginated-list";
import { Badge } from "@/components/ui/badge";
import { GlowCard } from "@/components/ui/card";
import { GradientText } from "@/components/ui/gradient-text";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

function Section({
	icon,
	chip,
	iconClass,
	label,
	items,
}: {
	icon: LucideIcon;
	chip: string;
	iconClass: string;
	label: string;
	items: string[];
}) {
	if (items.length === 0) return null;
	return (
		<View className="gap-1.5">
			<View className="flex-row items-center gap-2">
				<View
					className={cn(
						"h-6 w-6 items-center justify-center rounded-full",
						chip,
					)}
				>
					<Icon as={icon} size={13} className={iconClass} />
				</View>
				<Text variant="caption">{label}</Text>
			</View>
			{items.map((item) => (
				<Text key={item} className="text-foreground pl-8 text-sm">
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
				<GlowCard accent="none" className="gap-3 rounded-3xl p-4">
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
						icon={Sparkles}
						chip="bg-primary/15"
						iconClass="text-primary"
						label={t("changelog.new")}
						items={c.featuresApp}
					/>
					<Section
						icon={TrendingUp}
						chip="bg-accent/15"
						iconClass="text-accent"
						label={t("changelog.improved")}
						items={c.improvementsApp}
					/>
					<Section
						icon={Bug}
						chip="bg-muted"
						iconClass="text-muted-foreground"
						label={t("changelog.fixed")}
						items={c.bugfixesApp}
					/>
				</GlowCard>
			)}
		/>
	);
}
