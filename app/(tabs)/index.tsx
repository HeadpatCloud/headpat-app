import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { type Href, Link, router } from "expo-router";
import {
	CalendarPlus,
	ChevronRight,
	FileClock,
	ImagePlus,
	type LucideIcon,
	Megaphone,
	Plus,
	UsersRound,
} from "lucide-react-native";
import { useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

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
		<Link href={href} asChild>
			<Pressable accessibilityRole="button" accessibilityLabel={label}>
				<Card className="flex-row items-center gap-3 p-4">
					<Icon as={icon} size={20} className="text-foreground" />
					<Text className="text-foreground flex-1 font-medium">{label}</Text>
					<Icon as={ChevronRight} size={20} className="text-muted-foreground" />
				</Card>
			</Pressable>
		</Link>
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
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={label}
			className="flex-row items-center gap-3 py-3"
		>
			<View className="bg-primary/15 h-10 w-10 items-center justify-center rounded-full">
				<Icon as={icon} size={20} className="text-primary" />
			</View>
			<Text className="text-foreground flex-1 font-medium">{label}</Text>
			<Icon as={ChevronRight} size={20} className="text-muted-foreground" />
		</Pressable>
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

	return (
		<>
			<ScrollView
				className="bg-background flex-1"
				contentContainerStyle={{ padding: 16, gap: 20 }}
			>
				<View className="gap-1">
					<Text variant="muted">Welcome back</Text>
					<Text variant="h2" className="border-0">
						{session?.user?.name ?? "Headpat"}
					</Text>
				</View>

				<Button
					onPress={() => createRef.current?.present()}
					accessibilityRole="button"
					accessibilityLabel="Create"
				>
					<Icon as={Plus} size={18} className="text-primary-foreground" />
					<Text>Create</Text>
				</Button>

				<View className="gap-2">
					<Text variant="small" className="text-muted-foreground uppercase">
						Upcoming events
					</Text>
					{events.isLoading ? (
						<Skeleton className="h-20 w-full" />
					) : events.data && events.data.length > 0 ? (
						events.data.map((e) => (
							<Pressable
								key={e.id}
								onPress={() => router.push(`/events/${e.id}`)}
								accessibilityRole="button"
								accessibilityLabel={e.title}
							>
								<Card className="flex-row items-center gap-3 p-3">
									<Avatar
										fileId={e.community?.avatarFileId}
										name={e.community?.name}
										kind="community-avatar"
										size={44}
									/>
									<View className="flex-1 gap-0.5">
										<Text variant="large" numberOfLines={1}>
											{e.title}
										</Text>
										{e.community?.name ? (
											<Text variant="muted" numberOfLines={1}>
												{e.community.name}
											</Text>
										) : null}
										<Text variant="small" className="text-muted-foreground">
											{formatDistanceToNow(new Date(e.startsAt), {
												addSuffix: true,
											})}
										</Text>
									</View>
								</Card>
							</Pressable>
						))
					) : (
						<Text variant="muted">No upcoming events.</Text>
					)}
				</View>

				<View className="gap-2">
					<QuickLink
						icon={Megaphone}
						label="Announcements"
						href="/announcements"
					/>
					<QuickLink icon={FileClock} label="What's new" href="/changelog" />
				</View>
			</ScrollView>

			<Sheet ref={createRef}>
				<View className="gap-1">
					<Text variant="large" className="pb-1">
						Create
					</Text>
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
