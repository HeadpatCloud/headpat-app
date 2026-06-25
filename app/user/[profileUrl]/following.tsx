import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import { Users } from "@/components/icons";
import { PaginatedList } from "@/components/paginated-list";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { GradientText } from "@/components/ui/gradient-text";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { orpc } from "@/lib/orpc";

export default function Following() {
	const { t } = useI18n();
	const { profileUrl } = useLocalSearchParams<{ profileUrl: string }>();
	const { data: session, isPending } = useSession();
	const profile = useQuery(
		orpc.profile.byUrl.queryOptions({ input: { profileUrl } }),
	);
	const userId = profile.data?.userId;

	const query = useInfiniteQuery({
		...orpc.follow.following.infiniteOptions({
			input: (page: number) => ({ userId: userId ?? "", page, pageSize: 24 }),
			initialPageParam: 1,
			getNextPageParam: (last) =>
				last.page * last.pageSize < last.total ? last.page + 1 : undefined,
		}),
		enabled: !!userId && !!session,
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
			// Show the skeleton (not the empty state) while the profile lookup that
			// gates this query is still resolving.
			query={{
				...query,
				isLoading: query.isLoading || profile.isLoading,
				isError: query.isError || profile.isError,
				error: query.error ?? profile.error,
			}}
			keyExtractor={(u) => u.userId}
			emptyTitle={t("profile.notFollowingAnyone")}
			ListHeaderComponent={
				<View className="gap-0.5 pb-4">
					<GradientText className="text-2xl font-bold tracking-tight">
						{profile.data?.displayName ??
							profile.data?.name ??
							`@${profileUrl}`}
					</GradientText>
					<Text variant="muted">{t("profile.followingSubtitle")}</Text>
				</View>
			}
			renderItem={(u) => (
				<PressableScale
					onPress={() => router.push(`/user/${u.profileUrl}`)}
					haptic="selection"
					accessibilityRole="button"
					accessibilityLabel={u.displayName ?? u.profileUrl}
				>
					<Card className="flex-row items-center gap-3 p-3">
						<Avatar
							fileId={u.avatarFileId}
							name={u.displayName ?? u.name}
							kind="avatar"
							size={48}
							ring
							ringWidth={2}
						/>
						<View className="flex-1 gap-0.5">
							<Text variant="large" numberOfLines={1}>
								{u.displayName ?? u.profileUrl}
							</Text>
							<Text variant="muted" numberOfLines={1}>
								@{u.profileUrl}
							</Text>
						</View>
					</Card>
				</PressableScale>
			)}
		/>
	);
}
