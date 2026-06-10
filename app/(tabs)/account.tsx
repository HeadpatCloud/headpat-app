import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import { useRef } from "react";
import { View } from "react-native";
import { CountBadge } from "@/components/count-badge";
import {
	Bell,
	LifeBuoy,
	Link2,
	type LucideIcon,
	Palette,
	ShieldCheck,
	UserPen,
} from "@/components/icons";
import { SettingsRow } from "@/components/settings-row";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/card";
import { GradientText } from "@/components/ui/gradient-text";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { signOut, useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { orpc } from "@/lib/orpc";

const ROWS: { href: Href; icon: LucideIcon; titleKey: string }[] = [
	{ href: "/notifications", icon: Bell, titleKey: "titles.notifications" },
	{ href: "/profile-edit", icon: UserPen, titleKey: "titles.profileEdit" },
	{ href: "/appearance", icon: Palette, titleKey: "titles.appearance" },
	{ href: "/security", icon: ShieldCheck, titleKey: "titles.security" },
	{ href: "/connections", icon: Link2, titleKey: "titles.connections" },
	{ href: "/tickets", icon: LifeBuoy, titleKey: "titles.tickets" },
];

export default function Account() {
	const { t } = useI18n();
	const { data } = useSession();
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
			<View className="bg-background flex-1 gap-6 p-6">
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
				<SettingsRow
					icon={Palette}
					label={t("titles.appearance")}
					index={2}
					onPress={() => router.push("/appearance")}
					accessibilityLabel={t("account.hub.rowA11y", {
						label: t("titles.appearance"),
					})}
				/>
			</View>
		);
	}

	const displayName =
		me.data?.displayName || data.user?.name || t("account.hub.yourAccount");

	return (
		<View className="bg-background flex-1 gap-6 p-6">
			<AnimatedEntrance index={0}>
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
				</GlowCard>
			</AnimatedEntrance>

			<View className="gap-3">
				{ROWS.map((row, i) => (
					<SettingsRow
						key={row.titleKey}
						icon={row.icon}
						label={t(row.titleKey)}
						badge={
							row.href === "/notifications" ? (
								<CountBadge count={unreadCount} />
							) : undefined
						}
						index={i + 1}
						onPress={() => router.push(row.href)}
						accessibilityLabel={t("account.hub.rowA11y", {
							label: t(row.titleKey),
						})}
					/>
				))}
			</View>

			<AnimatedEntrance index={ROWS.length + 1} className="mt-auto">
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
							onPress={() => {
								sheetRef.current?.dismiss();
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
		</View>
	);
}
