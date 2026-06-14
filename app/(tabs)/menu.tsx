import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import { useRef } from "react";
import { ScrollView, View } from "react-native";
import { CountBadge } from "@/components/count-badge";
import {
	Bell,
	ChevronRight,
	FileClock,
	LifeBuoy,
	Link2,
	type LucideIcon,
	MapPin,
	Megaphone,
	MessageCircle,
	Palette,
	Scale,
	Shield,
	ShieldCheck,
	UserPen,
} from "@/components/icons";
import { SettingsRow } from "@/components/settings-row";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/card";
import { GradientText } from "@/components/ui/gradient-text";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { signOut, useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { orpc } from "@/lib/orpc";
import { unregisterPushToken } from "@/lib/push";
import { usePlatformPermissions } from "@/lib/use-permissions";

type Row = { href: Href; icon: LucideIcon; titleKey: string };
type T = ReturnType<typeof useI18n>["t"];

const SETTINGS_ROWS: Row[] = [
	{ href: "/notifications", icon: Bell, titleKey: "titles.notifications" },
	{ href: "/profile-edit", icon: UserPen, titleKey: "titles.profileEdit" },
	{ href: "/appearance", icon: Palette, titleKey: "titles.appearance" },
	{ href: "/security", icon: ShieldCheck, titleKey: "titles.security" },
	{ href: "/connections", icon: Link2, titleKey: "titles.connections" },
	{ href: "/locations" as Href, icon: MapPin, titleKey: "titles.locations" },
];

const SUPPORT_ROWS: Row[] = [
	{ href: "/tickets", icon: LifeBuoy, titleKey: "titles.tickets" },
	{ href: "/support", icon: MessageCircle, titleKey: "titles.support" },
	{ href: "/announcements", icon: Megaphone, titleKey: "titles.announcements" },
	{ href: "/changelog", icon: FileClock, titleKey: "titles.changelog" },
	{ href: "/legal", icon: Scale, titleKey: "titles.legal" },
];

// Tickets needs a session; everything else in the group is public.
const GUEST_SUPPORT_ROWS = SUPPORT_ROWS.filter((r) => r.href !== "/tickets");

function GroupLabel({ index, children }: { index: number; children: string }) {
	return (
		<AnimatedEntrance index={index}>
			<Text variant="caption" className="px-1 uppercase tracking-wider">
				{children}
			</Text>
		</AnimatedEntrance>
	);
}

function RowGroup({
	rows,
	startIndex,
	unreadCount,
	t,
}: {
	rows: Row[];
	startIndex: number;
	unreadCount: number;
	t: T;
}) {
	return (
		<View className="gap-3">
			{rows.map((row, i) => (
				<SettingsRow
					key={row.titleKey}
					icon={row.icon}
					label={t(row.titleKey)}
					badge={
						row.href === "/notifications" ? (
							<CountBadge count={unreadCount} />
						) : undefined
					}
					index={startIndex + i}
					onPress={() => router.push(row.href)}
					accessibilityLabel={t("account.hub.rowA11y", {
						label: t(row.titleKey),
					})}
				/>
			))}
		</View>
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
				contentContainerClassName="gap-5 p-6"
			>
				<AnimatedEntrance index={0}>
					<GlowCard className="gap-1 p-5">
						<GradientText className="text-2xl font-extrabold tracking-tight">
							{t("account.guest.title")}
						</GradientText>
						<Text variant="muted">{t("account.guest.subtitle")}</Text>
					</GlowCard>
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
				<GroupLabel index={2}>{t("menu.groups.settings")}</GroupLabel>
				<SettingsRow
					icon={Palette}
					label={t("titles.appearance")}
					index={3}
					onPress={() => router.push("/appearance")}
					accessibilityLabel={t("account.hub.rowA11y", {
						label: t("titles.appearance"),
					})}
				/>
				<GroupLabel index={4}>{t("menu.groups.support")}</GroupLabel>
				<RowGroup
					rows={GUEST_SUPPORT_ROWS}
					startIndex={5}
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
			contentContainerClassName="gap-5 p-6 pb-10"
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
					<GlowCard className="flex-row items-center gap-4 p-5">
						<Avatar
							fileId={me.data?.avatarFileId}
							name={displayName}
							size={64}
							ring
						/>
						<View className="flex-1 gap-0.5">
							{me.isLoading ? (
								<Skeleton className="h-7 w-40 rounded-lg" />
							) : (
								<GradientText className="text-2xl font-extrabold tracking-tight">
									{displayName}
								</GradientText>
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
					</GlowCard>
				</PressableScale>
			</AnimatedEntrance>

			<GroupLabel index={1}>{t("menu.groups.settings")}</GroupLabel>
			<RowGroup
				rows={SETTINGS_ROWS}
				startIndex={2}
				unreadCount={unreadCount}
				t={t}
			/>

			<GroupLabel index={SETTINGS_ROWS.length + 2}>
				{t("menu.groups.support")}
			</GroupLabel>
			<RowGroup
				rows={SUPPORT_ROWS}
				startIndex={SETTINGS_ROWS.length + 3}
				unreadCount={unreadCount}
				t={t}
			/>

			{showAdmin ? (
				<>
					<GroupLabel index={SETTINGS_ROWS.length + SUPPORT_ROWS.length + 3}>
						{t("menu.groups.admin")}
					</GroupLabel>
					<SettingsRow
						icon={Shield}
						label={t("titles.admin")}
						index={SETTINGS_ROWS.length + SUPPORT_ROWS.length + 4}
						onPress={() => router.push("/admin")}
						accessibilityLabel={t("account.hub.rowA11y", {
							label: t("titles.admin"),
						})}
					/>
				</>
			) : null}

			<AnimatedEntrance
				index={SETTINGS_ROWS.length + SUPPORT_ROWS.length + (showAdmin ? 5 : 3)}
				className="pt-2"
			>
				<Button
					variant="destructive"
					fullWidth
					onPress={() => sheetRef.current?.present()}
					accessibilityRole="button"
					accessibilityLabel={t("account.signOut.action")}
				>
					<Text>{t("account.signOut.action")}</Text>
				</Button>
			</AnimatedEntrance>

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
