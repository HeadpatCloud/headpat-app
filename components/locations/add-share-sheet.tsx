import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
	keepPreviousData,
	useInfiniteQuery,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { forwardRef, useState } from "react";
import { Alert, ScrollView, TextInput, View } from "react-native";
import { DurationPicker } from "@/components/locations/duration-picker";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { locationApi, locationQueries } from "@/lib/location/api";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

type Target = {
	type: "user" | "community";
	id: string;
	name: string;
	avatarFileId?: string | null;
};

type Step = "target" | "duration" | "precision" | "confirm";

function UserSearch({ onSelect }: { onSelect: (t: Target) => void }) {
	const [text, setText] = useState("");
	const [search, setSearch] = useState("");
	const [seed] = useState(() => Math.random().toString(36).slice(2, 10));
	const { t } = useI18n();

	const query = useInfiniteQuery({
		...orpc.profile.list.infiniteOptions({
			input: (page: number) => ({
				page,
				pageSize: 20,
				...(search ? { search } : { seed }),
			}),
			initialPageParam: 1,
			getNextPageParam: (last) =>
				last.page * last.pageSize < last.total ? last.page + 1 : undefined,
		}),
		placeholderData: keepPreviousData,
	});

	const users = query.data?.pages.flatMap((p) => p.items) ?? [];

	return (
		<View className="gap-2">
			<TextInput
				value={text}
				onChangeText={setText}
				onSubmitEditing={() => setSearch(text.trim())}
				placeholder={t("users.searchPlaceholder")}
				autoCapitalize="none"
				autoCorrect={false}
				returnKeyType="search"
				className="border-border bg-input h-11 rounded-xl border px-3 text-foreground"
				accessibilityLabel={t("users.searchPlaceholder")}
			/>
			<ScrollView className="max-h-64" showsVerticalScrollIndicator={false}>
				{users.map((u) => (
					<PressableScale
						key={u.userId}
						onPress={() =>
							onSelect({
								type: "user",
								id: u.userId,
								name: u.displayName ?? u.profileUrl,
								avatarFileId: u.avatarFileId,
							})
						}
						haptic="selection"
						accessibilityRole="button"
						accessibilityLabel={u.displayName ?? u.profileUrl}
					>
						<Card className="mb-2 flex-row items-center gap-3 p-3">
							<Avatar
								fileId={u.avatarFileId}
								name={u.displayName ?? u.name}
								kind="avatar"
								size={36}
							/>
							<View className="flex-1">
								<Text numberOfLines={1}>{u.displayName ?? u.profileUrl}</Text>
								<Text variant="muted" numberOfLines={1}>
									@{u.profileUrl}
								</Text>
							</View>
						</Card>
					</PressableScale>
				))}
			</ScrollView>
		</View>
	);
}

function CommunityList({ onSelect }: { onSelect: (t: Target) => void }) {
	const { t } = useI18n();
	const communities = useQuery(
		orpc.community.myFollowedCommunities.queryOptions(),
	);
	const rows = communities.data ?? [];

	if (rows.length === 0) return null;

	return (
		<View className="gap-2">
			<Text variant="muted">{t("locations.shareWithCommunity")}</Text>
			{rows.map((c) => (
				<PressableScale
					key={c.id}
					onPress={() =>
						onSelect({
							type: "community",
							id: c.id,
							name: c.name,
							avatarFileId: c.avatarFileId,
						})
					}
					haptic="selection"
					accessibilityRole="button"
					accessibilityLabel={c.name}
				>
					<Card className="flex-row items-center gap-3 p-3">
						<Avatar
							fileId={c.avatarFileId}
							name={c.name}
							kind="community-avatar"
							size={36}
						/>
						<Text numberOfLines={1} className="flex-1">
							{c.name}
						</Text>
					</Card>
				</PressableScale>
			))}
		</View>
	);
}

export const AddShareSheet = forwardRef<BottomSheetModal>((_props, ref) => {
	const { t } = useI18n();
	const qc = useQueryClient();

	const [step, setStep] = useState<Step>("target");
	const [target, setTarget] = useState<Target | null>(null);
	const [expiresAt, setExpiresAt] = useState<string | null>(null);
	const [durationLabel, setDurationLabel] = useState<string>("");
	const [precision, setPrecision] = useState<"exact" | "approximate">("exact");
	const [busy, setBusy] = useState(false);

	// Fetch member count when a community is selected (for the confirm step).
	const communityDetail = useQuery({
		...orpc.community.byId.queryOptions({
			input: { communityId: target?.type === "community" ? target.id : "" },
		}),
		enabled: step === "confirm" && target?.type === "community",
	});

	const reset = () => {
		setStep("target");
		setTarget(null);
		setExpiresAt(null);
		setDurationLabel("");
		setPrecision("exact");
	};

	const selectTarget = (t: Target) => {
		setTarget(t);
		setStep("duration");
	};

	const confirm = async () => {
		if (!target) return;
		setBusy(true);
		try {
			await locationApi.grant({
				targetType: target.type,
				targetId: target.id,
				expiresAt,
				precision,
			});
			await qc.invalidateQueries({
				queryKey: locationQueries.mine().queryKey,
			});
			reset();
			(ref as React.RefObject<BottomSheetModal>).current?.dismiss();
		} catch (e) {
			Alert.alert(t("locations.errorTitle"), humanizeError(e));
		} finally {
			setBusy(false);
		}
	};

	const durationText =
		expiresAt === null
			? t("locations.untilOff")
			: t("locations.forDuration", { label: durationLabel });

	return (
		<Sheet ref={ref} title={t("locations.add")} accent>
			<ScrollView
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<View className="gap-3 pb-2">
					{step === "target" ? (
						<View className="gap-4">
							<View className="gap-1">
								<Text variant="muted">{t("locations.shareWithUser")}</Text>
								<UserSearch onSelect={selectTarget} />
							</View>
							<CommunityList onSelect={selectTarget} />
						</View>
					) : null}

					{step === "duration" ? (
						<View className="gap-2">
							<Text variant="muted">{t("locations.pickDuration")}</Text>
							<DurationPicker
								onChange={(exp, label) => {
									setExpiresAt(exp);
									setDurationLabel(label);
									setStep("precision");
								}}
							/>
						</View>
					) : null}

					{step === "precision" ? (
						<View className="gap-2">
							<Text variant="muted">{t("locations.pickPrecision")}</Text>
							<Button
								size="lg"
								fullWidth
								onPress={() => {
									setPrecision("exact");
									setStep("confirm");
								}}
							>
								<Text>{t("locations.precisionExact")}</Text>
							</Button>
							<Button
								size="lg"
								fullWidth
								variant="secondary"
								onPress={() => {
									setPrecision("approximate");
									setStep("confirm");
								}}
							>
								<Text>{t("locations.precisionApprox")}</Text>
							</Button>
						</View>
					) : null}

					{step === "confirm" && target ? (
						<View className="gap-3">
							<View className="flex-row items-center gap-3">
								<Avatar
									fileId={target.avatarFileId ?? null}
									name={target.name}
									kind={
										target.type === "community" ? "community-avatar" : "avatar"
									}
									size={48}
								/>
								<Text variant="large" className="flex-1" numberOfLines={2}>
									{target.name}
								</Text>
							</View>
							<Text>
								{target.type === "user"
									? t("locations.confirmUser", {
											name: target.name,
											duration: durationText,
										})
									: t("locations.confirmCommunity", {
											count: communityDetail.data?.followersCount ?? 0,
											name: target.name,
											duration: durationText,
										})}
							</Text>
							<Button
								size="lg"
								fullWidth
								loading={busy}
								disabled={busy}
								onPress={confirm}
							>
								<Text>{t("locations.confirm")}</Text>
							</Button>
							<Button
								size="lg"
								fullWidth
								variant="ghost"
								onPress={() => setStep("precision")}
							>
								<Text>{t("common.back")}</Text>
							</Button>
						</View>
					) : null}
				</View>
			</ScrollView>
		</Sheet>
	);
});
AddShareSheet.displayName = "AddShareSheet";
