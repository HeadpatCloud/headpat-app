import { useInfiniteQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import { Users } from "@/components/icons";
import { PaginatedList } from "@/components/paginated-list";
import { PersonRow } from "@/components/person-row";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { orpc } from "@/lib/orpc";

// Everyone who RSVP'd to an event, oldest RSVP first.
export default function EventAttendees() {
	const { t } = useI18n();
	const { eventId } = useLocalSearchParams<{ eventId: string }>();
	const { data: session, isPending } = useSession();

	const query = useInfiniteQuery({
		...orpc.event.attendees.infiniteOptions({
			input: (page: number) => ({ eventId, page, pageSize: 30 }),
			initialPageParam: 1,
			getNextPageParam: (last) =>
				last.page * last.pageSize < last.total ? last.page + 1 : undefined,
		}),
		enabled: !!session,
	});

	if (!session) {
		if (isPending) return <View className="bg-background flex-1" />;
		return (
			<View className="bg-background flex-1 justify-center">
				<EmptyState
					icon={Users}
					title={t("account.guest.title")}
					subtitle={t("account.guest.subtitle")}
					action={{
						label: t("account.guest.signIn"),
						onPress: () => router.push("/(auth)/login"),
					}}
				/>
			</View>
		);
	}

	return (
		<PaginatedList
			query={query}
			keyExtractor={(u) => u.userId}
			emptyIcon={Users}
			emptyTitle={t("events.nobodyGoing")}
			renderItem={(u) => (
				<PersonRow
					person={u}
					onPress={(p) => router.push(`/user/${p.profileUrl}`)}
				/>
			)}
		/>
	);
}
