import {
	type RecordingOptions,
	RecordingPresets,
	setAudioModeAsync,
	useAudioRecorder,
	useAudioRecorderState,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { VoicePlayer } from "@/components/chat/voice-player";
import { ArrowUp, Square, Trash2 } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { humanizeError } from "@/lib/orpc-error";
import { useTheme } from "@/lib/theme/provider";
import { formatVoiceDuration, VOICE_MAX_MS, VOICE_MIN_MS } from "@/lib/voice";

/** Mono AAC in .m4a: small, and what the API stores for every player anyway. */
const VOICE_RECORDING: RecordingOptions = {
	...RecordingPresets.HIGH_QUALITY,
	numberOfChannels: 1,
	bitRate: 64_000,
};

export type VoiceTake = { uri: string; durationMs: number };

type Phase = "starting" | "recording" | "recorded" | "sending";

type Props = {
	onSend: (take: VoiceTake) => Promise<void>;
	onClose: () => void;
};

const removeFile = (uri: string | null | undefined) => {
	if (uri) FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
};

// Stands in for the composer while recording: starts as soon as it appears,
// then offers the take to listen back to, send or throw away.
export function VoiceRecorderBar({ onSend, onClose }: Props) {
	const { t } = useI18n();
	const { colors } = useTheme();
	const recorder = useAudioRecorder(VOICE_RECORDING);
	const state = useAudioRecorderState(recorder, 200);
	const [phase, setPhase] = useState<Phase>("starting");
	const [take, setTake] = useState<VoiceTake | null>(null);
	const closed = useRef(false);

	const close = useCallback(() => {
		closed.current = true;
		onClose();
	}, [onClose]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				await setAudioModeAsync({
					allowsRecording: true,
					playsInSilentMode: true,
				});
				await recorder.prepareToRecordAsync();
				if (cancelled) return;
				recorder.record();
				setPhase("recording");
			} catch (e) {
				if (cancelled) return;
				Alert.alert(t("chat.voiceFailed"), humanizeError(e));
				close();
			}
		})();
		return () => {
			cancelled = true;
			// Hand the audio session back to playback (louder, and no mic dot).
			setAudioModeAsync({ allowsRecording: false }).catch(() => {});
		};
	}, [recorder, t, close]);

	const stop = useCallback(async () => {
		if (phase !== "recording") return;
		const durationMs = Math.min(state.durationMillis, VOICE_MAX_MS);
		try {
			await recorder.stop();
		} catch (e) {
			Alert.alert(t("chat.voiceFailed"), humanizeError(e));
			close();
			return;
		}
		await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
		const uri = recorder.uri;
		if (!uri || durationMs < VOICE_MIN_MS) {
			removeFile(uri);
			close();
			return;
		}
		setTake({ uri, durationMs });
		setPhase("recorded");
	}, [phase, state.durationMillis, recorder, t, close]);

	// Stop on our own at the length limit.
	useEffect(() => {
		if (phase === "recording" && state.durationMillis >= VOICE_MAX_MS) {
			void stop();
		}
	}, [phase, state.durationMillis, stop]);

	const discard = async () => {
		if (phase === "recording") {
			try {
				await recorder.stop();
			} catch {
				// nothing was being written
			}
			removeFile(recorder.uri);
		} else removeFile(take?.uri);
		close();
	};

	const send = async () => {
		if (!take) return;
		setPhase("sending");
		try {
			await onSend(take);
			removeFile(take.uri);
			if (!closed.current) close();
		} catch (e) {
			Alert.alert(t("chat.voiceSendFailed"), humanizeError(e));
			setPhase("recorded");
		}
	};

	const busy = phase === "sending";
	return (
		<View className="bg-card border-border flex-row items-center gap-2 rounded-3xl border p-1.5">
			<Pressable
				onPress={discard}
				disabled={busy}
				hitSlop={6}
				accessibilityRole="button"
				accessibilityLabel={t("chat.voiceDiscard")}
				className={`h-10 w-10 items-center justify-center rounded-2xl ${busy ? "opacity-50" : ""}`}
			>
				<Icon as={Trash2} size={18} className="text-destructive" />
			</Pressable>
			{take && (phase === "recorded" || phase === "sending") ? (
				<>
					<VoicePlayer uri={take.uri} durationMs={take.durationMs} bare />
					<Pressable
						onPress={send}
						disabled={busy}
						accessibilityRole="button"
						accessibilityLabel={t("chat.voiceSend")}
						className="bg-primary h-10 w-10 items-center justify-center rounded-2xl"
					>
						{busy ? (
							<ActivityIndicator color={colors["primary-foreground"]} />
						) : (
							<Icon
								as={ArrowUp}
								size={20}
								className="text-primary-foreground"
							/>
						)}
					</Pressable>
				</>
			) : (
				<>
					<View className="flex-1 flex-row items-center gap-2.5 px-1">
						<View className="bg-destructive h-2.5 w-2.5 rounded-full" />
						<Text className="flex-1 text-sm font-semibold">
							{phase === "starting"
								? t("chat.voiceStarting")
								: t("chat.voiceRecording")}
						</Text>
						<Text className="text-muted-foreground text-xs font-semibold">
							{formatVoiceDuration(state.durationMillis)} /{" "}
							{formatVoiceDuration(VOICE_MAX_MS)}
						</Text>
					</View>
					<Pressable
						onPress={stop}
						disabled={phase !== "recording"}
						accessibilityRole="button"
						accessibilityLabel={t("chat.voiceStop")}
						className={`bg-destructive h-10 w-10 items-center justify-center rounded-2xl ${phase === "recording" ? "" : "opacity-50"}`}
					>
						<Icon
							as={Square}
							size={14}
							className="text-destructive-foreground"
							fill="currentColor"
						/>
					</Pressable>
				</>
			)}
		</View>
	);
}
