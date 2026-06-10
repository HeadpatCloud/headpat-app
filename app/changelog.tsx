import { useInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns/format";
import { View } from "react-native";
import { PaginatedList } from "@/components/paginated-list";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { orpc } from "@/lib/orpc";

function Section({ label, items }: { label: string; items: string[] }) {
	if (items.length === 0) return null;
	return (
		<View className="gap-1">
			<Text variant="small" className="text-muted-foreground uppercase">
				{label}
			</Text>
			{items.map((item) => (
				<Text key={item} className="text-foreground text-sm">
					• {item}
				</Text>
			))}
		</View>
	);
}

export default function Changelog() {
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
			emptyTitle="No changelog entries"
			renderItem={(c) => (
				<Card className="gap-3 p-4">
					<View className="flex-row items-center gap-2">
						<Text variant="large" className="flex-1">
							{c.title}
						</Text>
						{c.version ? <Badge variant="outline">{c.version}</Badge> : null}
					</View>
					<Text variant="small" className="text-muted-foreground">
						{format(new Date(c.publishedAt ?? c.createdAt), "PP")}
					</Text>
					{c.description ? (
						<Text className="text-foreground text-sm">{c.description}</Text>
					) : null}
					<Section label="New" items={[...c.featuresApp, ...c.featuresWeb]} />
					<Section
						label="Improved"
						items={[...c.improvementsApp, ...c.improvementsWeb]}
					/>
					<Section label="Fixed" items={[...c.bugfixesApp, ...c.bugfixesWeb]} />
				</Card>
			)}
		/>
	);
}
