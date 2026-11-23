import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import { useRef } from "react";
import { ScrollView, View } from "react-native";
import { CountBadge } from "@/components/count-badge";
import {
	Bell,
	CalendarDays,
	ChevronRight,
	FileClock,
	HardDrive,
	Images,
	LifeBuoy,
	Link2,
	LogOut,
	type LucideIcon,
	MapPin,
	Megaphone,
	Palette,
	Radar,
	Scale,
	Shield,
	ShieldCheck,
	UserPen,
	UserRound,
	UsersRound,
} from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { NavGroup, NavRow } from "@/components/ui/nav-group";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { signOut, useSession } from "@/lib/auth-client";
import { clearCollections } from "@/lib/db/collections";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { orpc } from "@/lib/orpc";
import { unregisterPushToken } from "@/lib/push";
import { persister, queryClient } from "@/lib/query";
import { usePlatformPermissions } from "@/lib/use-permissions";

type Row = { href: Href; icon: LucideIcon; titleKey: string };
type T = ReturnType<typeof useI18n>["t"];

const BROWSE_ROWS: Row[] = [
	{ href: "/users", icon: UserRound, titleKey: "titles.users" },
	{ href: "/gallery", icon: Images, titleKey: "titles.gallery" },
	{ href: "/community", icon: UsersRound, titleKey: "titles.communities" },
	{ href: "/events", icon: CalendarDays, titleKey: "titles.events" },
	{ href: "/locations", icon: MapPin, titleKey: "titles.map" },
	{ href: "/locations/nearby" as Href, icon: Radar, titleKey: "titles.nearby" },
	{ href: "/notifications", icon: Bell, titleKey: "titles.notifications" },
];

const SETTINGS_ROWS: Row[] = [
	{ href: "/profile-edit", icon: UserPen, titleKey: "titles.profileEdit" },
	{ href: "/appearance", icon: Palette, titleKey: "titles.appearance" },
	{ href: "/security", icon: ShieldCheck, titleKey: "titles.security" },
	{ href: "/connections", icon: Link2, titleKey: "titles.connections" },
	{ href: "/storage", icon: HardDrive, titleKey: "titles.storage" },
];

const SUPPORT_ROWS: Row[] = [
	// Tickets live inside Help & support, like on the website.
	{ href: "/support", icon: LifeBuoy, titleKey: "support.title" },
	{ href: "/announcements", icon: Megaphone, titleKey: "titles.announcements" },
	{ href: "/changelog", icon: FileClock, titleKey: "titles.changelog" },
	{ href: "/legal", icon: Scale, titleKey: "titles.legal" },
];

// Neither needs an account. Clearing the cache especially has to work signed
// out, since a wedged cache is a reason someone ends up signed out.
const GUEST_SETTINGS_ROWS: Row[] = SETTINGS_ROWS.filter(
	(r) => r.href === "/appearance" || r.href === "/storage",
);

function RowGroup({
	title,
	rows,
	unreadCount,
	t,
}: {
	title: string;
	rows: Row[];
	unreadCount: number;
	t: T;
}) {
	return (
		<NavGroup title={title}>
			{rows.map((row) => (
				<NavRow
					key={row.titleKey}
					icon={row.icon}
					label={t(row.titleKey)}
					badge={
						row.href === "/notifications" ? (
							<CountBadge count={unreadCount} />
						) : undefined
					}
					onPress={() => router.push(row.href)}
					accessibilityLabel={t("account.hub.rowA11y", {
						label: t(row.titleKey),
					})}
				/>
			))}
		</NavGroup>
	);
}

export default function Menu() {
	const { t } = useI18n();
	const { data } = useSession();
	const { can } = usePlatformPermissions();
	const sheetRef = useRef<BottomSheetModal>(null);
	const me = useQuery({
		...orpc.profile.me.queryOptions({ input: {} }),
		enabled: !!data,
	});
	const unread = useQuery({
		...orpc.notification.unreadCount.queryOptions(),
		enabled: !!data,
	});
	const unreadCount = unread.data?.count ?? 0;

	if (!data) {
		return (
			<ScrollView
				className="bg-background flex-1"
				contentContainerClassName="gap-4 p-3 pb-6"
			>
				<AnimatedEntrance index={0}>
					<Card className="gap-1 p-5">
						<Text className="font-display text-2xl font-semibold">
							{t("account.guest.title")}
						</Text>
						<Text className="text-muted-foreground font-semibold">
							{t("account.guest.subtitle")}
						</Text>
					</Card>
				</AnimatedEntrance>
				<AnimatedEntrance index={1} className="gap-3">
					<Button
						size="lg"
						fullWidth
						onPress={() => router.push("/(auth)/login")}
						accessibilityRole="button"
						accessibilityLabel={t("account.guest.signIn")}
					>
						<Text>{t("account.guest.signIn")}</Text>
					</Button>
					<Button
						variant="outline"
						fullWidth
						onPress={() => router.push("/(auth)/register")}
						accessibilityRole="button"
						accessibilityLabel={t("account.guest.createAccount")}
					>
						<Text>{t("account.guest.createAccount")}</Text>
					</Button>
				</AnimatedEntrance>
				<RowGroup
					title={t("menu.groups.settings")}
					rows={GUEST_SETTINGS_ROWS}
					unreadCount={0}
					t={t}
				/>
				<RowGroup
					title={t("menu.groups.support")}
					rows={SUPPORT_ROWS}
					unreadCount={0}
					t={t}
				/>
			</ScrollView>
		);
	}

	const displayName =
		me.data?.displayName || data.user?.name || t("account.hub.yourAccount");
	const showAdmin =
		can("legal:manage") || can("reports:view") || can("tickets:view");

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerClassName="gap-4 p-3 pb-6"
		>
			<AnimatedEntrance index={0}>
				<PressableScale
					onPress={() => {
						if (me.data?.profileUrl) router.push(`/user/${me.data.profileUrl}`);
					}}
					haptic="selection"
					accessibilityRole="button"
					accessibilityLabel={t("account.hub.viewProfile")}
				>
					<Card className="flex-row items-center gap-4 p-5">
						<Avatar
							fileId={me.data?.avatarFileId}
							name={displayName}
							size={60}
							fallback="muted"
						/>
						<View className="flex-1 gap-0.5">
							{me.isLoading ? (
								<Skeleton className="h-7 w-40 rounded-lg" />
							) : (
								<Text
									numberOfLines={1}
									className="font-display text-2xl font-semibold"
								>
									{displayName}
								</Text>
							)}
							<Text variant="muted" numberOfLines={1}>
								{data.user?.email ?? "…"}
							</Text>
						</View>
						<Icon
							as={ChevronRight}
							size={20}
							className="text-muted-foreground"
						/>
					</Card>
				</PressableScale>
			</AnimatedEntrance>

			<RowGroup
				title={t("menu.groups.browse")}
				rows={BROWSE_ROWS}
				unreadCount={unreadCount}
				t={t}
			/>
			<RowGroup
				title={t("menu.groups.settings")}
				rows={SETTINGS_ROWS}
				unreadCount={unreadCount}
				t={t}
			/>
			<RowGroup
				title={t("menu.groups.support")}
				rows={SUPPORT_ROWS}
				unreadCount={unreadCount}
				t={t}
			/>
			{showAdmin ? (
				<NavGroup title={t("menu.groups.admin")}>
					<NavRow
						icon={Shield}
						label={t("titles.admin")}
						onPress={() => router.push("/admin")}
						accessibilityLabel={t("account.hub.rowA11y", {
							label: t("titles.admin"),
						})}
					/>
				</NavGroup>
			) : null}
			<NavGroup>
				<NavRow
					icon={LogOut}
					label={t("account.signOut.action")}
					tone="destructive"
					onPress={() => sheetRef.current?.present()}
				/>
			</NavGroup>

			<Sheet ref={sheetRef} title={t("account.signOut.confirmTitle")} accent>
				<View className="gap-3">
					<Text variant="muted">{t("account.signOut.confirmBody")}</Text>
					<View className="gap-3 pt-1">
						<Button
							variant="destructive"
							onPress={async () => {
								sheetRef.current?.dismiss();
								// Drop this device's push token while the session is still
								// alive — unregister is an authed call.
								await unregisterPushToken();
								// Persisted per-account data has no user dimension: SQLite
								// collections and the query blob hold NSFW gallery rows and
								// private community events for whoever was signed in, so both
								// have to go before the next account arrives.
								clearCollections();
								queryClient.clear();
								persister.removeClient();
								signOut();
							}}
							accessibilityRole="button"
							accessibilityLabel={t("account.signOut.confirm")}
						>
							<Text>{t("account.signOut.action")}</Text>
						</Button>
						<Button
							variant="outline"
							onPress={() => sheetRef.current?.dismiss()}
							accessibilityRole="button"
							accessibilityLabel={t("common.cancel")}
						>
							<Text>{t("common.cancel")}</Text>
						</Button>
					</View>
				</View>
			</Sheet>
		</ScrollView>
	);
}
