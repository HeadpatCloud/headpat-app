import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import { UserRound } from "@/components/icons";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { orpc } from "@/lib/orpc";
import { useTheme } from "@/lib/theme/provider";

/**
 * Resolver for the web's /profile link: there is no "my profile" screen, so
 * send people to their own profile, or to sign-in when there's no session.
 * Replaces itself so it never shows up in the back stack.
 */
export default function MyProfile() {
	const { t } = useI18n();
	const { colors } = useTheme();
	const { data: session, isPending } = useSession();
	const me = useQuery({
		...orpc.profile.me.queryOptions({ input: {} }),
		enabled: !!session,
	});

	const profileUrl = me.data?.profileUrl;

	useEffect(() => {
		if (isPending) return;
		if (!session) {
			router.replace("/(auth)/login");
			return;
		}
		if (profileUrl) router.replace(`/user/${profileUrl}`);
	}, [isPending, session, profileUrl]);

	if (me.isError) {
		return (
			<View className="bg-background flex-1 justify-center">
				<EmptyState
					icon={UserRound}
					title={t("profile.unavailable")}
					action={{ label: t("common.retry"), onPress: () => me.refetch() }}
				/>
			</View>
		);
	}

	return (
		<View className="bg-background flex-1 items-center justify-center">
			<ActivityIndicator color={colors.foreground} />
		</View>
	);
}
