import { router } from "expo-router";
import { memo } from "react";
import { Pressable, View } from "react-native";
import { SectionCard } from "@/components/ui/section-card";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import type { client } from "@/lib/orpc";

type UpcomingEvent = Awaited<ReturnType<typeof client.event.upcoming>>[number];

// Next two events as date tiles, alternating tints like the website.
export const UpNext = memo(function UpNext({
	events,
}: {
	events: UpcomingEvent[];
}) {
	const { t, locale } = useI18n();
	return (
		<SectionCard
			title={t("home.upNext")}
			link={{
				label: t("home.allEvents"),
				onPress: () => router.push("/events"),
			}}
		>
			{events.length === 0 ? (
				<Text className="text-muted-foreground text-sm">
					{t("home.noUpcomingEvents")}
				</Text>
			) : (
				events.map((e, i) => {
					const at = new Date(e.startsAt);
					const where =
						e.locationText ||
						(e.locationZoneMethod === "virtual" ? "Online" : "");
					const meta = [e.community?.name, where].filter(Boolean).join(" · ");
					return (
						<Pressable
							key={e.id}
							onPress={() => router.push(`/event/${e.id}`)}
							accessibilityRole="button"
							accessibilityLabel={e.title}
							className={`active:opacity-80 flex-row items-center gap-3.5 rounded-2xl p-3.5 ${i % 2 === 0 ? "bg-primary/10" : "bg-accent/20"}`}
						>
							<View className="bg-card h-14 w-14 items-center justify-center rounded-2xl">
								<Text className="text-link text-xs font-extrabold tracking-wider">
									{at
										.toLocaleDateString(locale, { month: "short" })
										.toUpperCase()}
								</Text>
								<Text className="font-display text-2xl font-semibold leading-7">
									{at.getDate()}
								</Text>
							</View>
							<View className="min-w-0 flex-1">
								<Text numberOfLines={1} className="font-extrabold">
									{e.title}
								</Text>
								{meta ? (
									<Text
										numberOfLines={1}
										className="text-muted-foreground text-sm font-semibold"
									>
										{meta}
									</Text>
								) : null}
							</View>
						</Pressable>
					);
				})
			)}
		</SectionCard>
	);
});
