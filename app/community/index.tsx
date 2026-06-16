import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Plus, Search, Users } from "@/components/icons";
import { PaginatedList } from "@/components/paginated-list";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { orpc } from "@/lib/orpc";
import { RADIUS } from "@/lib/theme/foundations";
import { useTheme } from "@/lib/theme/provider";

export default function Communities() {
	const { data: session } = useSession();
	const { t } = useI18n();
	const { colors } = useTheme();
	const [text, setText] = useState("");
	const [search, setSearch] = useState("");

	const query = useInfiniteQuery({
		...orpc.community.list.infiniteOptions({
			input: (page: number) => ({
				page,
				pageSize: 24,
				...(search ? { search } : {}),
			}),
			initialPageParam: 1,
			getNextPageParam: (last) =>
				last.page * last.pageSize < last.total ? last.page + 1 : undefined,
		}),
		// Keep the old results (and the search input mounted) while a new
		// search term loads, instead of flashing the skeleton screen.
		placeholderData: keepPreviousData,
	});

	return (
		<View className="bg-background flex-1">
			<PaginatedList
				query={query}
				keyExtractor={(c) => c.id}
				emptyTitle={
					search
						? t("community.index.emptySearchTitle")
						: t("community.index.emptyTitle")
				}
				emptySubtitle={
					search ? t("community.index.emptySearchSubtitle") : undefined
				}
				ListHeaderComponent={
					<View className="gap-4 pb-3">
						<View className="flex-row items-center gap-2">
							<Input
								value={text}
								onChangeText={setText}
								onSubmitEditing={() => setSearch(text.trim())}
								returnKeyType="search"
								placeholder={t("community.index.searchPlaceholder")}
								containerClassName="flex-1"
								accessibilityLabel={t("community.index.searchPlaceholder")}
							/>
							<PressableScale
								onPress={() => setSearch(text.trim())}
								haptic="selection"
								accessibilityRole="button"
								accessibilityLabel={t("common.search")}
							>
								<Gradient
									borderRadius={RADIUS.sm}
									style={{
										height: 48,
										width: 48,
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									<Icon
										as={Search}
										size={20}
										color={colors["primary-foreground"]}
									/>
								</Gradient>
							</PressableScale>
						</View>
					</View>
				}
				renderItem={(c) => (
					<PressableScale
						onPress={() => router.push(`/community/${c.id}`)}
						haptic="selection"
						accessibilityRole="button"
						accessibilityLabel={c.name}
					>
						<Card className="flex-row gap-3 p-4">
							<Avatar
								fileId={c.avatarFileId}
								name={c.name}
								kind="community-avatar"
								size={52}
							/>
							<View className="flex-1 gap-1">
								<Text variant="large" numberOfLines={1}>
									{c.name}
								</Text>
								{c.description ? (
									<Text variant="muted" numberOfLines={2}>
										{c.description}
									</Text>
								) : null}
								<View className="flex-row items-center gap-1.5 pt-0.5">
									<Icon
										as={Users}
										size={14}
										className="text-muted-foreground"
									/>
									<Text variant="small" className="text-muted-foreground">
										{c.followersCount}
									</Text>
								</View>
								{c.tags.length > 0 ? (
									<View className="flex-row flex-wrap gap-1.5 pt-1">
										{c.tags.slice(0, 3).map((tag, i) => (
											<Badge
												key={tag}
												variant={i === 0 ? "tonal" : "secondary"}
											>
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
					onPress={() => router.push("/community/new")}
					accessibilityLabel={t("community.index.new")}
				/>
			) : null}
		</View>
	);
}
