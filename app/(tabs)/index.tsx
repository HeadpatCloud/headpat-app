import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { type Href, router } from "expo-router";
import { useRef } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { GlowBackdrop } from "@/components/brand/glow-backdrop";
import {
	CalendarPlus,
	ChevronRight,
	FileClock,
	ImagePlus,
	type LucideIcon,
	Megaphone,
	Plus,
	RefreshCw,
	UsersRound,
} from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { orpc } from "@/lib/orpc";

type Event = {
	id: string;
	title: string;
	startsAt: string | number | Date;
	community?: { name?: string | null; avatarFileId?: string | null } | null;
};

function GradientChip({ icon }: { icon: LucideIcon }) {
	return (
		<View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full">
			<Gradient opacity={0.18} style={StyleSheet.absoluteFill} />
			<Icon as={icon} size={20} className="text-primary" />
		</View>
	);
}

function QuickLink({
	icon,
	label,
	href,
}: {
	icon: LucideIcon;
	label: string;
	href: Href;
}) {
	return (
		<PressableScale
			onPress={() => router.push(href)}
			haptic="selection"
			accessibilityRole="button"
			accessibilityLabel={label}
		>
			<Card className="flex-row items-center gap-3 rounded-2xl p-4">
				<GradientChip icon={icon} />
				<Text className="text-foreground flex-1 font-medium">{label}</Text>
				<Icon as={ChevronRight} size={20} className="text-muted-foreground" />
			</Card>
		</PressableScale>
	);
}

function CreateRow({
	icon,
	label,
	onPress,
}: {
	icon: LucideIcon;
	label: string;
	onPress: () => void;
}) {
	return (
		<PressableScale
			onPress={onPress}
			haptic="selection"
			accessibilityRole="button"
			accessibilityLabel={label}
			style={{ paddingVertical: 16 }}
		>
			<View className="flex-row items-center gap-3">
				<GradientChip icon={icon} />
				<Text className="text-foreground flex-1 font-medium">{label}</Text>
				<Icon as={ChevronRight} size={20} className="text-muted-foreground" />
			</View>
		</PressableScale>
	);
}

function EventCard({ event, featured }: { event: Event; featured?: boolean }) {
	return (
		<PressableScale
			onPress={() => router.push(`/events/${event.id}`)}
			haptic="selection"
			accessibilityRole="button"
			accessibilityLabel={event.title}
		>
			<Card
				className={`flex-row items-center gap-3 overflow-hidden rounded-2xl ${featured ? "p-4" : "p-3"}`}
			>
				{featured ? (
					<>
						<GlowBackdrop
							size={180}
							style={{
								position: "absolute",
								left: -60,
								top: -40,
								opacity: 0.25,
							}}
						/>
						<Gradient
							style={{
								position: "absolute",
								left: 0,
								top: 0,
								bottom: 0,
								width: 3,
							}}
						/>
					</>
				) : null}
				<Avatar
					fileId={event.community?.avatarFileId}
					name={event.community?.name}
					kind="community-avatar"
					size={featured ? 52 : 48}
				/>
				<View className="flex-1 gap-0.5">
					{featured ? (
						<Text variant="caption" className="text-primary">
							Next up
						</Text>
					) : null}
					<Text variant="large" numberOfLines={1}>
						{event.title}
					</Text>
					{event.community?.name ? (
						<Text variant="muted" numberOfLines={1}>
							{event.community.name}
						</Text>
					) : null}
					<Text variant="small" className="text-muted-foreground">
						{formatDistanceToNow(new Date(event.startsAt), { addSuffix: true })}
					</Text>
				</View>
			</Card>
		</PressableScale>
	);
}

export default function Home() {
	const { data: session } = useSession();
	const createRef = useRef<BottomSheetModal>(null);
	const events = useQuery(
		orpc.event.upcoming.queryOptions({ input: { limit: 5 } }),
	);

	const create = (path: string) => {
		createRef.current?.dismiss();
		router.push(path);
	};

	const requireAuth = (action: () => void) => {
		if (session) action();
		else router.push("/(auth)/login");
	};

	const list = (events.data ?? []) as Event[];

	return (
		<>
			<ScrollView
				className="bg-background flex-1"
				contentContainerStyle={{ padding: 16, gap: 24 }}
				refreshControl={
					<RefreshControl
						refreshing={events.isRefetching}
						onRefresh={() => events.refetch()}
					/>
				}
			>
				<AnimatedEntrance index={0}>
					<View className="gap-0.5">
						<Text variant="caption" className="text-muted-foreground">
							{session ? "Welcome back" : "Welcome"}
						</Text>
						<Text className="text-foreground text-4xl leading-[44px] font-extrabold tracking-tight">
							{session?.user?.name ?? "Headpat"}
						</Text>
					</View>
				</AnimatedEntrance>

				<AnimatedEntrance index={1}>
					<Button
						variant="default"
						size="lg"
						fullWidth
						onPress={() => requireAuth(() => createRef.current?.present())}
						accessibilityRole="button"
						accessibilityLabel="Create"
					>
						<Icon as={Plus} size={18} className="text-primary-foreground" />
						<Text>Create</Text>
					</Button>
				</AnimatedEntrance>

				<AnimatedEntrance index={2} className="gap-2">
					<Text variant="small" className="text-muted-foreground uppercase">
						Upcoming events
					</Text>
					{events.isLoading ? (
						<View className="gap-2">
							<Skeleton className="h-24 w-full rounded-2xl" />
							<Skeleton className="h-20 w-full rounded-2xl" />
						</View>
					) : events.isError ? (
						<Card className="flex-row items-center gap-3 rounded-2xl p-4">
							<Text variant="muted" className="flex-1">
								Couldn't load events.
							</Text>
							<Button
								variant="ghost"
								size="sm"
								onPress={() => events.refetch()}
								accessibilityRole="button"
								accessibilityLabel="Retry loading events"
							>
								<Icon as={RefreshCw} size={16} className="text-foreground" />
								<Text>Retry</Text>
							</Button>
						</Card>
					) : list.length > 0 ? (
						<View className="gap-2">
							{list.map((e, i) => (
								<EventCard key={e.id} event={e} featured={i === 0} />
							))}
						</View>
					) : (
						<Card className="flex-row items-center gap-3 rounded-2xl p-4">
							<GradientChip icon={CalendarPlus} />
							<Text variant="muted" className="flex-1">
								No upcoming events.
							</Text>
							<Button
								variant="ghost"
								size="sm"
								onPress={() => requireAuth(() => create("/events/new"))}
								accessibilityRole="button"
								accessibilityLabel="Create an event"
							>
								<Text>Create</Text>
							</Button>
						</Card>
					)}
				</AnimatedEntrance>

				<AnimatedEntrance index={3} className="gap-2">
					<QuickLink
						icon={Megaphone}
						label="Announcements"
						href="/announcements"
					/>
					<QuickLink icon={FileClock} label="What's new" href="/changelog" />
				</AnimatedEntrance>
			</ScrollView>

			<Sheet ref={createRef} title="Create" accent>
				<View className="gap-1">
					<CreateRow
						icon={ImagePlus}
						label="Gallery post"
						onPress={() => create("/gallery/upload")}
					/>
					<CreateRow
						icon={UsersRound}
						label="Community"
						onPress={() => create("/community/new")}
					/>
					<CreateRow
						icon={CalendarPlus}
						label="Event"
						onPress={() => create("/events/new")}
					/>
				</View>
			</Sheet>
		</>
	);
}
