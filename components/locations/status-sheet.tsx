import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { forwardRef, useEffect, useState } from "react";
import { Alert, TextInput, View } from "react-native";
import { Check } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import {
	MANUAL_STATUS_COLORS,
	type ManualStatus,
} from "@/lib/presence/status-color";

const STATUSES: ManualStatus[] = ["online", "away", "dnd", "invisible"];

// Sets the caller's presence (status + message) — the same presence shown on the
// map ring and elsewhere in the app.
export const StatusSheet = forwardRef<BottomSheetModal>((_props, ref) => {
	const { t } = useI18n();
	const qc = useQueryClient();
	const { data: session } = useSession();
	const myId = session?.user?.id;
	const [status, setStatus] = useState<ManualStatus>("online");
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);

	const mine = useQuery({
		...orpc.presence.getMany.queryOptions({
			input: { userIds: myId ? [myId] : [] },
		}),
		enabled: !!myId,
	});

	// Seed the form from current presence once it loads. A connected user who
	// shows "offline" is invisible (they're using the app right now).
	useEffect(() => {
		const me = myId ? mine.data?.[myId] : undefined;
		if (!me) return;
		setStatus(
			me.status === "offline" ? "invisible" : (me.status as ManualStatus),
		);
		setMessage(me.customStatus ?? "");
	}, [mine.data, myId]);

	const save = async () => {
		setBusy(true);
		try {
			await client.presence.setStatus({
				manualStatus: status,
				customStatus: message.trim() || null,
			});
			await qc.invalidateQueries({ queryKey: orpc.presence.getMany.key() });
			(ref as React.RefObject<BottomSheetModal>).current?.dismiss();
		} catch (e) {
			Alert.alert(t("locations.errorTitle"), humanizeError(e));
		} finally {
			setBusy(false);
		}
	};

	return (
		<Sheet ref={ref} title={t("presence.statusTitle")} accent>
			<View className="gap-3 pb-2">
				<View className="gap-2">
					{STATUSES.map((s) => {
						const selected = s === status;
						return (
							<PressableScale
								key={s}
								onPress={() => setStatus(s)}
								haptic="selection"
								accessibilityRole="radio"
								accessibilityState={{ selected }}
								accessibilityLabel={t(`presence.${s}`)}
							>
								<View
									className={
										selected
											? "border-primary bg-accent/40 flex-row items-center gap-3 rounded-xl border px-3 py-3"
											: "border-border flex-row items-center gap-3 rounded-xl border px-3 py-3"
									}
								>
									<View
										style={{
											width: 12,
											height: 12,
											borderRadius: 6,
											backgroundColor: MANUAL_STATUS_COLORS[s],
										}}
									/>
									<Text className="text-foreground flex-1">
										{t(`presence.${s}`)}
									</Text>
									{selected ? (
										<Icon as={Check} size={18} className="text-primary" />
									) : null}
								</View>
							</PressableScale>
						);
					})}
				</View>

				<TextInput
					value={message}
					onChangeText={setMessage}
					placeholder={t("presence.statusPlaceholder")}
					maxLength={140}
					className="border-border bg-input h-11 rounded-xl border px-3 text-foreground"
					accessibilityLabel={t("presence.statusPlaceholder")}
				/>

				<Button fullWidth loading={busy} disabled={busy} onPress={save}>
					<Text>{t("common.save")}</Text>
				</Button>
			</View>
		</Sheet>
	);
});
StatusSheet.displayName = "StatusSheet";
