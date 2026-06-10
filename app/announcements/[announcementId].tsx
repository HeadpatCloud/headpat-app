import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import { Megaphone } from "@/components/icons";
import { Gradient } from "@/components/ui/gradient";
import { GradientText } from "@/components/ui/gradient-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { orpc } from "@/lib/orpc";

export default function Announcement() {
	const { t } = useI18n();
	const { announcementId } = useLocalSearchParams<{ announcementId: string }>();
	const { data, isLoading } = useQuery(
		orpc.announcement.byId.queryOptions({ input: { announcementId } }),
	);

	if (isLoading) {
		return (
			<View className="bg-background flex-1 gap-3 p-4">
				<Skeleton className="h-8 w-2/3" />
				<Skeleton className="h-40 w-full" />
			</View>
		);
	}

	if (!data) {
		return (
			<View className="bg-background flex-1 justify-center">
				<EmptyState
					icon={Megaphone}
					title={t("announcements.goneTitle")}
					subtitle={t("announcements.goneSubtitle")}
				/>
			</View>
		);
	}

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{ padding: 16, gap: 12 }}
		>
			<AnimatedEntrance className="gap-3">
				<View className="gap-2 overflow-hidden rounded-3xl p-4">
					<Gradient
						opacity={0.08}
						start={{ x: 0, y: 0 }}
						end={{ x: 0, y: 1 }}
						style={StyleSheet.absoluteFill}
						pointerEvents="none"
					/>
					{data.title ? (
						<View accessibilityRole="header">
							<GradientText className="text-3xl font-extrabold leading-9 tracking-tight">
								{data.title}
							</GradientText>
						</View>
					) : null}
					{data.sideText ? <Text variant="muted">{data.sideText}</Text> : null}
				</View>
				<Text className="text-foreground px-1 leading-6">
					{data.description}
				</Text>
			</AnimatedEntrance>
		</ScrollView>
	);
}
