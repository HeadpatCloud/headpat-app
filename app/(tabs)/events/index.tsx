import { useInfiniteQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { router } from "expo-router";
import { View } from "react-native";
import { DateBlock } from "@/components/event/date-block";
import { MapPin, Plus, Users } from "@/components/icons";
import { PaginatedList } from "@/components/paginated-list";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { orpc } from "@/lib/orpc";

export default function Events() {
	const { data: session } = useSession();
	const { t } = useI18n();
	const query = useInfiniteQuery(
		orpc.event.list.infiniteOptions({
			input: (page: number) => ({ page, pageSize: 24 }),
			initialPageParam: 1,
			getNextPageParam: (last) =>
				last.page * last.pageSize < last.total ? last.page + 1 : undefined,
		}),
	);

	return (
		<View className="flex-1">
			<PaginatedList
				query={query}
				keyExtractor={(e) => e.id}
				emptyTitle={t("events.emptyTitle")}
				emptySubtitle={t("events.emptySubtitle")}
				skeleton={<Skeleton className="h-20 w-full rounded-2xl" />}
				renderItem={(e) => (
					<PressableScale
						onPress={() => router.push(`/event/${e.id}`)}
						haptic="selection"
						accessibilityRole="button"
						accessibilityLabel={e.title}
					>
						<Card className="flex-row gap-3 p-4">
							<DateBlock date={new Date(e.startsAt)} className="self-start" />
							<View className="flex-1 gap-2.5">
								<Text
									variant="large"
									className="font-bold"
									style={{ letterSpacing: -0.4 }}
									numberOfLines={2}
								>
									{e.title}
								</Text>
								{e.locationText ? (
									<View className="flex-row items-center gap-1.5">
										<Icon
											as={MapPin}
											size={14}
											className="text-muted-foreground"
										/>
										<Text variant="muted" numberOfLines={1} className="flex-1">
											{e.locationText}
										</Text>
									</View>
								) : null}
								<View className="flex-row items-center gap-3">
									<Text variant="small" className="text-muted-foreground">
										{formatDistanceToNow(new Date(e.startsAt), {
											addSuffix: true,
										})}
									</Text>
									<View className="flex-row items-center gap-1.5">
										<Icon
											as={Users}
											size={14}
											className="text-muted-foreground"
										/>
										<Text variant="small" className="text-muted-foreground">
											{e.attendeesCount}
										</Text>
									</View>
								</View>
								{e.tags.length > 0 ? (
									<View className="flex-row flex-wrap gap-1.5">
										{e.tags.map((tag) => (
											<Badge key={tag} variant="secondary">
												{tag}
											</Badge>
										))}
									</View>
								) : null}
							</View>
						</Card>
					</PressableScale>
				)}
			/>
			{session ? (
				<Fab
					icon={Plus}
					bottom={24}
					onPress={() => router.push("/events/new")}
					accessibilityLabel={t("events.newEvent")}
				/>
			) : null}
		</View>
	);
}
