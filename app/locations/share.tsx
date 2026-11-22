import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { BackgroundLocationDisclosure } from "@/components/background-location-disclosure";
import { AddShareSheet } from "@/components/locations/add-share-sheet";
import { ExtendSheet } from "@/components/locations/extend-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { locationApi, locationQueries } from "@/lib/location/api";
import { timeLeftLabel } from "@/lib/location/format";
import { useLocationSharing } from "@/lib/location/use-location-sharing";
import { useTargetName } from "@/lib/location/use-target-name";
import { humanizeError } from "@/lib/orpc-error";

type Share = {
	id: string;
	targetType: "user" | "community";
	targetId: string;
	precision: "exact" | "approximate";
	expiresAt: Date | string | null;
	revokedAt: Date | string | null;
};

function expiryLabel(
	t: (key: string, opts?: Record<string, unknown>) => string,
	expiresAt: Date | string | null,
): string {
	// expiresAt may be a Date or an ISO string (rehydrated cache) — coerce.
	const tk = timeLeftLabel(
		expiresAt ? new Date(expiresAt).toISOString() : null,
	);
	if (tk === "indefinite") return t("locations.indefinite");
	if (tk === "expired") return t("locations.expired");
	return t("locations.expiresIn", { label: tk });
}

function ShareRow({
	share,
	onExtend,
	onRemove,
	onTogglePrecision,
	removing,
	precisionPending,
}: {
	share: Share;
	onExtend: (id: string) => void;
	onRemove: (id: string) => void;
	onTogglePrecision: (share: Share) => void;
	removing: boolean;
	precisionPending: boolean;
}) {
	const { t } = useI18n();
	const name = useTargetName(share.targetType, share.targetId);

	return (
		<Card className="gap-2 p-3">
			<View className="flex-row items-center gap-2">
				<View className="flex-1 gap-0.5">
					<Text numberOfLines={1} className="font-medium">
						{share.targetType === "community" ? `#${name}` : name}
					</Text>
					<Text variant="muted" numberOfLines={1}>
						{expiryLabel(t, share.expiresAt)}
					</Text>
				</View>
			</View>

			{/* Precision toggle */}
			<View className="flex-row items-center gap-2">
				<Text variant="small" className="flex-1 text-muted-foreground">
					{share.precision === "exact"
						? t("locations.precisionExact")
						: t("locations.precisionApprox")}
				</Text>
				<Button
					size="sm"
					variant="outline"
					onPress={() => onTogglePrecision(share)}
					disabled={precisionPending}
				>
					<Text>{t("locations.precisionSwitch")}</Text>
				</Button>
			</View>

			{/* Actions */}
			<View className="flex-row gap-2">
				<Button
					size="sm"
					variant="secondary"
					onPress={() => onExtend(share.id)}
					className="flex-1"
				>
					<Text>{t("locations.extend")}</Text>
				</Button>
				<Button
					size="sm"
					variant="destructive"
					onPress={() => onRemove(share.id)}
					disabled={removing}
					className="flex-1"
				>
					<Text>{t("locations.remove")}</Text>
				</Button>
			</View>
		</Card>
	);
}

export default function ManageSharesScreen() {
	const { t } = useI18n();
	const qc = useQueryClient();
	const addRef = useRef<BottomSheetModal>(null);
	const extendRef = useRef<BottomSheetModal>(null);
	const [extendId, setExtendId] = useState<string | null>(null);
	const { activeCount, needsBackgroundConsent, enableBackgroundSharing } =
		useLocationSharing();
	// Prominent disclosure (Google Play): auto-present once when this screen opens
	// without background permission, so it's seen before any permission request and
	// without needing to create a share first. Re-openable via the inline button.
	const [disclosureVisible, setDisclosureVisible] = useState(false);
	const [autoShown, setAutoShown] = useState(false);
	useEffect(() => {
		if (needsBackgroundConsent && !autoShown) {
			setDisclosureVisible(true);
			setAutoShown(true);
		}
	}, [needsBackgroundConsent, autoShown]);
	const shares = useQuery(locationQueries.mine());
	const status = useQuery(locationQueries.status());
	const paused = status.data?.paused ?? false;
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

	const pauseMutation = useMutation({
		mutationFn: () => (paused ? locationApi.resume() : locationApi.pause()),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: locationQueries.status().queryKey });
			qc.invalidateQueries({ queryKey: locationQueries.visible().queryKey });
		},
		onError: (e) => Alert.alert(t("locations.errorTitle"), humanizeError(e)),
	});

	const openExtend = (id: string) => {
		setExtendId(id);
		extendRef.current?.present();
	};

	return (
		<View className="flex-1">
			<ScrollView contentContainerClassName="gap-3 p-4">
				{/* Prominent disclosure: the text stays visible while background
				    location isn't granted; the OS permission is only ever requested
				    from the modal below, which always precedes the system prompt. */}
				{needsBackgroundConsent ? (
					<Card className="gap-2 p-4">
						<Text className="font-semibold">
							{t("locations.bgDisclosureTitle")}
						</Text>
						<Text variant="muted">{t("locations.bgDisclosureBody")}</Text>
						<Button fullWidth onPress={() => setDisclosureVisible(true)}>
							<Text>{t("locations.bgDisclosureAllow")}</Text>
						</Button>
					</Card>
				) : null}

				{/* Status header */}
				<View className="flex-row items-center justify-between gap-2">
					<Text variant="muted">
						{t("locations.sharingWith", { count: activeCount })}
					</Text>
					<Button
						size="sm"
						variant="secondary"
						onPress={() => pauseMutation.mutate()}
						loading={pauseMutation.isPending}
						disabled={pauseMutation.isPending}
					>
						<Text>{paused ? t("locations.resume") : t("locations.pause")}</Text>
					</Button>
				</View>

				{/* Paused banner: real server-side state, so resume re-enables sharing */}
				{paused ? (
					<Card className="bg-muted p-3">
						<Text className="font-medium">{t("locations.paused")}</Text>
					</Card>
				) : null}

				{/* Add share button */}
				<Button fullWidth onPress={() => addRef.current?.present()}>
					<Text>{t("locations.add")}</Text>
				</Button>

				{/* Active share rows */}
				{active.map((s) => (
					<ShareRow
						key={s.id}
						share={s}
						onExtend={openExtend}
						onRemove={(id) => removeMutation.mutate(id)}
						onTogglePrecision={(share) => precisionMutation.mutate(share)}
						removing={removeMutation.isPending}
						precisionPending={precisionMutation.isPending}
					/>
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
			<ExtendSheet ref={extendRef} shareId={extendId} />
			<BackgroundLocationDisclosure
				visible={disclosureVisible}
				onAllow={() => {
					setDisclosureVisible(false);
					void enableBackgroundSharing();
				}}
				onDismiss={() => setDisclosureVisible(false)}
			/>
		</View>
	);
}
