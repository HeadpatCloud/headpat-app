import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { type Href, Link, router } from "expo-router";
import {
	ChevronRight,
	FileClock,
	type LucideIcon,
	Megaphone,
} from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
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

export default function Home() {
	const { data: session } = useSession();
	const events = useQuery(
		orpc.event.upcoming.queryOptions({ input: { limit: 5 } }),
	);

	return (
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
	);
}
