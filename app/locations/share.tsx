import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { Alert, ScrollView, View } from "react-native";
import { AddShareSheet } from "@/components/locations/add-share-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { locationApi, locationQueries } from "@/lib/location/api";
import { timeLeftLabel } from "@/lib/location/format";
import { useLocationSharing } from "@/lib/location/use-location-sharing";
import { humanizeError } from "@/lib/orpc-error";

type Share = {
	id: string;
	targetType: "user" | "community";
	targetId: string;
	precision: "exact" | "approximate";
	expiresAt: Date | null;
	revokedAt: Date | null;
};

function expiryLabel(
	t: (key: string, opts?: Record<string, unknown>) => string,
	expiresAt: Date | null,
): string {
	const tk = timeLeftLabel(expiresAt ? expiresAt.toISOString() : null);
	if (tk === "indefinite") return t("locations.indefinite");
	if (tk === "expired") return t("locations.expired");
	return t("locations.expiresIn", { label: tk });
}

export default function ManageSharesScreen() {
	const { t } = useI18n();
	const qc = useQueryClient();
	const addRef = useRef<BottomSheetModal>(null);
	const { activeCount, pause, resume } = useLocationSharing();
	const shares = useQuery(locationQueries.mine());
	const active =
		(shares.data as Share[] | undefined)?.filter((s) => !s.revokedAt) ?? [];

	const refresh = () =>
		qc.invalidateQueries({ queryKey: locationQueries.mine().queryKey });

	const removeMutation = useMutation({
		mutationFn: (shareId: string) => locationApi.revoke({ shareId }),
		onSuccess: refresh,
		onError: (e) => Alert.alert(t("locations.errorTitle"), humanizeError(e)),
	});

	const stopAllMutation = useMutation({
		mutationFn: () =>
			Promise.all(
				active.map((s) =>
					locationApi.revoke({ shareId: s.id }).catch(() => {}),
				),
			),
		onSuccess: refresh,
		onError: (e) => Alert.alert(t("locations.errorTitle"), humanizeError(e)),
	});

	const precisionMutation = useMutation({
		mutationFn: (share: Share) =>
			locationApi.setPrecision({
				shareId: share.id,
				precision: share.precision === "exact" ? "approximate" : "exact",
			}),
		onSuccess: refresh,
		onError: (e) => Alert.alert(t("locations.errorTitle"), humanizeError(e)),
	});

	const isPaused = activeCount === 0;

	return (
		<View className="flex-1">
			<ScrollView contentContainerClassName="gap-3 p-4">
				{/* Status header */}
				<View className="flex-row items-center justify-between gap-2">
					<Text variant="muted">
						{t("locations.sharingWith", { count: activeCount })}
					</Text>
					<Button
						size="sm"
						variant="secondary"
						onPress={() => (isPaused ? resume() : pause())}
					>
						<Text>
							{isPaused ? t("locations.resume") : t("locations.pause")}
						</Text>
					</Button>
				</View>

				{/* Add share button */}
				<Button fullWidth onPress={() => addRef.current?.present()}>
					<Text>{t("locations.add")}</Text>
				</Button>

				{/* Active share rows */}
				{active.map((s: Share) => (
					<Card key={s.id} className="gap-2 p-3">
						<View className="flex-row items-center gap-2">
							<View className="flex-1 gap-0.5">
								<Text numberOfLines={1} className="font-medium">
									{s.targetType === "community" ? `#${s.targetId}` : s.targetId}
								</Text>
								<Text variant="muted" numberOfLines={1}>
									{expiryLabel(t, s.expiresAt)}
								</Text>
							</View>
						</View>

						{/* Precision toggle */}
						<View className="flex-row items-center gap-2">
							<Text variant="small" className="flex-1 text-muted-foreground">
								{s.precision === "exact"
									? t("locations.precisionExact")
									: t("locations.precisionApprox")}
							</Text>
							<Button
								size="sm"
								variant="outline"
								onPress={() => precisionMutation.mutate(s)}
								disabled={precisionMutation.isPending}
							>
								<Text>{t("locations.precisionSwitch")}</Text>
							</Button>
						</View>

						{/* Actions */}
						<View className="flex-row gap-2">
							<Button
								size="sm"
								variant="destructive"
								onPress={() => removeMutation.mutate(s.id)}
								disabled={removeMutation.isPending}
								className="flex-1"
							>
								<Text>{t("locations.remove")}</Text>
							</Button>
						</View>
					</Card>
				))}

				{/* Stop all */}
				{active.length > 0 ? (
					<Button
						variant="destructive"
						fullWidth
						onPress={() => stopAllMutation.mutate()}
						disabled={stopAllMutation.isPending}
					>
						<Text>{t("locations.stopAll")}</Text>
					</Button>
				) : null}
			</ScrollView>

			<AddShareSheet ref={addRef} />
		</View>
	);
}
