import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlowBackdrop } from "@/components/brand/glow-backdrop";
import { EmptyState } from "@/components/empty-state";
import { Inbox, Plus } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { GlowCard } from "@/components/ui/card";
import { Gradient } from "@/components/ui/gradient";
import { GradientText } from "@/components/ui/gradient-text";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { springs } from "@/lib/motion/springs";
import { orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { RADIUS } from "@/lib/theme/foundations";
import { useTheme } from "@/lib/theme/provider";

const Separator = () => <View className="h-3" />;

export default function Tickets() {
	const { t } = useI18n();
	const { colors } = useTheme();
	const query = useQuery(orpc.ticket.myList.queryOptions({ input: {} }));
	const animated = useRef(new Set<number>());

	if (query.isLoading) {
		return (
			<View className="bg-background flex-1 gap-3 p-4">
				{[0, 1, 2, 3, 4].map((i) => (
					<Skeleton key={i} className="h-20 w-full" />
				))}
			</View>
		);
	}

	if (query.isError) {
		return (
			<EmptyState
				icon={Inbox}
				title={t("common.couldntLoad")}
				subtitle={humanizeError(query.error)}
				action={{ label: t("common.retry"), onPress: () => query.refetch() }}
			/>
		);
	}

	return (
		<View className="bg-background flex-1">
			<FlashList
				data={query.data ?? []}
				keyExtractor={(item) => item.id}
				contentContainerStyle={{ padding: 16 }}
				ItemSeparatorComponent={Separator}
				ListHeaderComponent={
					<View className="gap-1 pb-4 pt-2">
						<GlowBackdrop size={220} style={styles.bloom} />
						<GradientText className="text-4xl font-extrabold leading-10 tracking-tight">
							{t("tickets.heading")}
						</GradientText>
						<Text variant="muted">{t("tickets.subtitle")}</Text>
					</View>
				}
				renderItem={({ item, index }) => {
					const seen = animated.current.has(index);
					if (!seen) animated.current.add(index);
					return (
						<AnimatedEntrance index={index} disabled={seen}>
							<PressableScale
								onPress={() => router.push(`/tickets/${item.id}`)}
								haptic="selection"
								accessibilityRole="button"
								accessibilityLabel={item.subject}
							>
								<GlowCard accent="none" className="gap-2 rounded-3xl p-4">
									<View className="flex-row items-start justify-between gap-2">
										<Text variant="large" className="flex-1">
											{item.subject}
										</Text>
										<Badge
											variant={
												item.status === "open" ? "gradient" : "secondary"
											}
										>
											{item.status === "open"
												? t("tickets.open")
												: t("tickets.closed")}
										</Badge>
									</View>
									<Text variant="small" className="text-muted-foreground">
										{t(`tickets.category.${item.category}`)} ·{" "}
										{formatDistanceToNow(new Date(item.lastMessageAt), {
											addSuffix: true,
										})}
									</Text>
								</GlowCard>
							</PressableScale>
						</AnimatedEntrance>
					);
				}}
				refreshControl={
					<RefreshControl
						refreshing={query.isRefetching}
						onRefresh={() => query.refetch()}
						tintColor={colors.primary}
						colors={[colors.primary]}
					/>
				}
				ListEmptyComponent={
					<EmptyState
						icon={Inbox}
						title={t("tickets.emptyTitle")}
						subtitle={t("tickets.emptySubtitle")}
					/>
				}
			/>
			<ComposeFab
				onPress={() => router.push("/tickets/new")}
				accessibilityLabel={t("tickets.newTicket")}
			/>
		</View>
	);
}

// Local FAB: the shared Fab anchors above the tab bar, but this is a
// root-stack screen without one, so it sits at bottom-6 right-6 instead.
function ComposeFab({
	onPress,
	accessibilityLabel,
}: {
	onPress: () => void;
	accessibilityLabel: string;
}) {
	const { colors } = useTheme();
	const insets = useSafeAreaInsets();
	const reduced = useReducedMotion();
	const mount = useSharedValue(reduced ? 1 : 0);

	useEffect(() => {
		if (reduced) {
			mount.value = 1;
			return;
		}
		mount.value = withSpring(1, springs.gentle);
	}, [reduced, mount]);

	const mountStyle = useAnimatedStyle(() => ({
		transform: [{ scale: mount.value }],
	}));

	return (
		<Animated.View
			pointerEvents="box-none"
			style={[
				{ position: "absolute", right: 24, bottom: insets.bottom + 24 },
				mountStyle,
			]}
		>
			<PressableScale
				scaleTo={0.96}
				haptic="selection"
				onPress={onPress}
				accessibilityRole="button"
				accessibilityLabel={accessibilityLabel}
			>
				<Gradient
					glow
					borderRadius={RADIUS.pill}
					style={{
						height: 56,
						width: 56,
						borderRadius: RADIUS.pill,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Icon as={Plus} size={24} color={colors["primary-foreground"]} />
				</Gradient>
			</PressableScale>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	bloom: { position: "absolute", top: -70, left: -60 },
});
