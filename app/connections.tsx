import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	FadeOutUp,
	LinearTransition,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/empty-state";
import {
	Github,
	KeyRound,
	Link2,
	type LucideIcon,
	Twitch,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { durations, springs } from "@/lib/motion/springs";
import { humanizeError } from "@/lib/orpc-error";

type Account = {
	id: string;
	accountId: string;
	providerId?: string;
	provider?: string;
};

const BRAND_LABELS: Record<string, string> = {
	google: "Google",
	discord: "Discord",
	apple: "Apple",
	github: "GitHub",
	twitch: "Twitch",
	eurofurence: "Eurofurence",
};

const PROVIDER_ICONS: Record<string, LucideIcon> = {
	credential: KeyRound,
	github: Github,
	twitch: Twitch,
};

const providerOf = (a: Account) => a.providerId ?? a.provider ?? "unknown";

export default function Connections() {
	const insets = useSafeAreaInsets();
	const { t } = useI18n();
	const reduced = useReducedMotion();
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [loading, setLoading] = useState(true);
	const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

	// No setLoading(true) here: post-unlink refetches update the list in place
	// instead of blanking it back to the skeletons.
	const load = useCallback(async () => {
		const res = await authClient.listAccounts();
		if (res.data) setAccounts(res.data as Account[]);
		setLoading(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const labelFor = (provider: string) =>
		provider === "credential"
			? t("account.connections.credential")
			: (BRAND_LABELS[provider] ?? provider);

	const unlink = (a: Account) => {
		const provider = providerOf(a);
		const label = labelFor(provider);
		Alert.alert(
			t("account.connections.confirmTitle"),
			t("account.connections.confirmBody", { provider: label }),
			[
				{ text: t("common.cancel"), style: "cancel" },
				{
					text: t("account.connections.disconnect"),
					style: "destructive",
					onPress: async () => {
						setUnlinkingId(a.id);
						try {
							const res = await authClient.unlinkAccount({
								providerId: provider,
								accountId: a.accountId,
							});
							if (res.error)
								Alert.alert(
									t("account.connections.errorTitle"),
									humanizeError(res.error),
								);
							else await load();
						} finally {
							setUnlinkingId(null);
						}
					},
				},
			],
		);
	};

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{
				padding: 16,
				paddingBottom: insets.bottom + 24,
				gap: 12,
			}}
		>
			<Text variant="muted">{t("account.connections.intro")}</Text>
			{loading ? (
				<>
					<Skeleton className="h-[72px] rounded-3xl" />
					<Skeleton className="h-[72px] rounded-3xl" />
					<Skeleton className="h-[72px] rounded-3xl" />
				</>
			) : accounts.length === 0 ? (
				<EmptyState
					icon={Link2}
					title={t("account.connections.emptyTitle")}
					subtitle={t("account.connections.emptySubtitle")}
				/>
			) : (
				accounts.map((a, i) => {
					const provider = providerOf(a);
					const canUnlink = provider !== "credential" && accounts.length > 1;
					const label = labelFor(provider);
					const entering = reduced
						? FadeIn.duration(durations.base)
						: FadeInDown.springify()
								.damping(springs.gentle.damping)
								.stiffness(springs.gentle.stiffness)
								.mass(springs.gentle.mass)
								.delay(i * 50);
					return (
						<Animated.View
							key={a.id}
							entering={entering}
							exiting={reduced ? undefined : FadeOutUp.duration(durations.fast)}
							layout={
								reduced
									? undefined
									: LinearTransition.springify()
											.damping(springs.layout.damping)
											.stiffness(springs.layout.stiffness)
											.mass(springs.layout.mass)
							}
						>
							<GlowCard
								accent="none"
								className="flex-row items-center gap-3 rounded-3xl p-4"
							>
								<View className="bg-primary/10 h-10 w-10 items-center justify-center rounded-2xl">
									<Icon
										as={PROVIDER_ICONS[provider] ?? Link2}
										size={20}
										className="text-primary"
									/>
								</View>
								<Text
									className="text-foreground flex-1 font-medium"
									numberOfLines={1}
								>
									{label}
								</Text>
								{canUnlink ? (
									<Button
										variant="outline"
										size="sm"
										loading={unlinkingId === a.id}
										onPress={() => unlink(a)}
										accessibilityLabel={t(
											"account.connections.disconnectA11y",
											{ provider: label },
										)}
									>
										<Text>{t("account.connections.disconnect")}</Text>
									</Button>
								) : null}
							</GlowCard>
						</Animated.View>
					);
				})
			)}
		</ScrollView>
	);
}
