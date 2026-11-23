import type { BadgeId, EarnedBadge } from "@backend/lib/badges";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import {
	ChevronRight,
	Crown,
	FlaskConical,
	Heart,
	type LucideIcon,
	Megaphone,
	ShieldCheck,
	Sparkles,
	Ticket,
} from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

// Same hues as the website's src/lib/badges.ts so a badge reads the same on both.
const BADGE_STYLE: Record<
	BadgeId,
	{ icon: LucideIcon; bg: string; fg: string }
> = {
	staff: {
		icon: ShieldCheck,
		bg: "bg-sky-500/15",
		fg: "text-sky-700 dark:text-sky-300",
	},
	communityFounder: {
		icon: Crown,
		bg: "bg-amber-500/15",
		fg: "text-amber-700 dark:text-amber-300",
	},
	eventHost: {
		icon: Megaphone,
		bg: "bg-violet-500/15",
		fg: "text-violet-700 dark:text-violet-300",
	},
	eventGoer: {
		icon: Ticket,
		bg: "bg-emerald-500/15",
		fg: "text-emerald-700 dark:text-emerald-300",
	},
	earlyMember: {
		icon: Sparkles,
		bg: "bg-fuchsia-500/15",
		fg: "text-fuchsia-700 dark:text-fuchsia-300",
	},
	supporter: {
		icon: Heart,
		bg: "bg-orange-500/15",
		fg: "text-orange-700 dark:text-orange-300",
	},
	betaTester: {
		icon: FlaskConical,
		bg: "bg-teal-500/15",
		fg: "text-teal-700 dark:text-teal-300",
	},
};

function useBadgeText() {
	const { t } = useI18n();
	return {
		t,
		name: (b: EarnedBadge) =>
			b.id === "eventGoer"
				? t(`badges.eventGoer.name.${b.level ?? 1}`)
				: t(`badges.${b.id}.name`),
		description: (b: EarnedBadge) =>
			b.count !== undefined
				? t(`badges.${b.id}.description`, { count: b.count })
				: t(`badges.${b.id}.description`),
	};
}

const BadgePill = memo(function BadgePill({
	badge,
	onPress,
}: {
	badge: EarnedBadge;
	onPress: (b: EarnedBadge) => void;
}) {
	const { name } = useBadgeText();
	const { icon, bg, fg } = BADGE_STYLE[badge.id];
	const label = name(badge);
	return (
		<PressableScale
			onPress={() => onPress(badge)}
			accessibilityRole="button"
			accessibilityLabel={label}
			hitSlop={4}
			className={cn("size-9 items-center justify-center rounded-full", bg)}
		>
			<Icon as={icon} size={17} className={fg} />
		</PressableScale>
	);
});

/** Earned and granted badges for a profile; tap one for what it means. */
export function ProfileBadges({ userId }: { userId: string }) {
	const { t, name, description } = useBadgeText();
	const sheetRef = useRef<BottomSheetModal>(null);
	const [open, setOpen] = useState<EarnedBadge | null>(null);
	const badges = useQuery({
		...orpc.profile.badges.queryOptions({ input: { userId } }),
		staleTime: 5 * 60 * 1000,
	});
	// A fresh object per tap so the same badge can be reopened. Present after
	// the content renders, or the dynamically sized sheet measures as empty.
	const show = useCallback((b: EarnedBadge) => setOpen({ ...b }), []);
	useEffect(() => {
		if (open) sheetRef.current?.present();
	}, [open]);

	if (!badges.data?.length) return null;
	const style = open ? BADGE_STYLE[open.id] : null;

	return (
		<>
			<View className="flex-row flex-wrap gap-1.5 pt-2">
				{badges.data.map((b) => (
					<BadgePill key={b.id} badge={b} onPress={show} />
				))}
			</View>
			<Sheet ref={sheetRef} accent>
				{open && style ? (
					<View className="gap-3">
						<View className="flex-row items-center gap-3">
							<View
								className={cn(
									"size-12 items-center justify-center rounded-full",
									style.bg,
								)}
							>
								<Icon as={style.icon} size={22} className={style.fg} />
							</View>
							<View className="flex-1">
								<Text variant="large" accessibilityRole="header">
									{name(open)}
								</Text>
								{open.level ? (
									<Text variant="muted">
										{t("badges.eventGoer.level", { level: open.level })}
									</Text>
								) : null}
							</View>
						</View>
						<Text>{description(open)}</Text>
						{open.next !== undefined && open.count !== undefined ? (
							<Text variant="muted">
								{t("badges.eventGoer.next", {
									count: open.next - open.count,
								})}
							</Text>
						) : null}
						{open.communities?.length ? (
							<View className="gap-1">
								<Text className="text-muted-foreground text-xs font-bold uppercase">
									{t("badges.communities")}
								</Text>
								{open.communities.map((c) => (
									<PressableScale
										key={c.id}
										onPress={() => {
											sheetRef.current?.dismiss();
											router.push(`/community/${c.id}`);
										}}
										accessibilityRole="link"
										className="bg-secondary rounded-2xl"
									>
										<View className="flex-row items-center gap-3 px-3 py-2.5">
											<Avatar
												fileId={c.avatarFileId}
												name={c.name}
												size={32}
												kind="community-avatar"
											/>
											<Text numberOfLines={1} className="flex-1 font-semibold">
												{c.name}
											</Text>
											<Icon
												as={ChevronRight}
												size={16}
												className="text-muted-foreground"
											/>
										</View>
									</PressableScale>
								))}
								{open.count !== undefined &&
								open.count > open.communities.length ? (
									<Text variant="muted" className="px-1 pt-1">
										{t("badges.communityFounder.more", {
											count: open.count - open.communities.length,
										})}
									</Text>
								) : null}
							</View>
						) : null}
					</View>
				) : null}
			</Sheet>
		</>
	);
}
