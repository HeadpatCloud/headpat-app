import type { LookingFor } from "@backend/lib/discovery";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TagInput } from "@/components/discovery/tag-input";
import { ToggleChips } from "@/components/discovery/toggle-chips";
import { Button } from "@/components/ui/button";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

export default function InterestsScreen() {
	const { t } = useI18n();
	const insets = useSafeAreaInsets();
	const qc = useQueryClient();
	const mine = useQuery(orpc.discovery.mine.queryOptions({ input: {} }));
	const options = useQuery(orpc.discovery.options.queryOptions());
	const [interests, setInterests] = useState<string[]>([]);
	const [lookingFor, setLookingFor] = useState<LookingFor[]>([]);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (!mine.data) return;
		setInterests(mine.data.interests);
		setLookingFor(mine.data.lookingFor);
	}, [mine.data]);

	const save = async () => {
		setBusy(true);
		try {
			await client.discovery.setInterests({ interests });
			await client.discovery.setLookingFor({ lookingFor });
			await qc.invalidateQueries({ queryKey: orpc.discovery.key() });
			router.back();
		} catch (e) {
			Alert.alert(t("locations.errorTitle"), humanizeError(e));
		} finally {
			setBusy(false);
		}
	};

	return (
		<KeyboardAwareScrollView
			className="bg-background flex-1"
			contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
		>
			<View className="gap-5">
				<Text variant="muted">{t("discovery.discoveryDescription")}</Text>
				<View className="gap-2">
					<Text className="font-semibold">{t("discovery.interestsTitle")}</Text>
					<Text variant="muted" className="text-sm">
						{t("discovery.interestsHint")}
					</Text>
					<TagInput
						kind="interest"
						value={interests}
						onChange={setInterests}
						max={options.data?.maxInterests ?? 20}
						placeholder={t("discovery.interestsPlaceholder")}
						label={t("discovery.interestsTitle")}
					/>
				</View>
				<View className="gap-2">
					<Text className="font-semibold">
						{t("discovery.lookingForTitle")}
					</Text>
					<ToggleChips
						options={options.data?.lookingFor ?? []}
						value={lookingFor}
						onChange={setLookingFor}
						label={(k) => t(`discovery.lookingFor.${k}`)}
					/>
				</View>
				<Button
					fullWidth
					loading={busy}
					disabled={busy || mine.isPending}
					onPress={save}
				>
					<Text>{t("discovery.save")}</Text>
				</Button>
			</View>
		</KeyboardAwareScrollView>
	);
}
