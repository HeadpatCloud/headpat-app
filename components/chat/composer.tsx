import { requestRecordingPermissionsAsync } from "expo-audio";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
	Alert,
	Linking,
	Pressable,
	TextInput,
	type TextInputInstance,
	View,
} from "react-native";
import {
	VoiceRecorderBar,
	type VoiceTake,
} from "@/components/chat/voice-recorder-bar";
import { ArrowUp, Mic, Pencil, X } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

type ComposerProps = {
	placeholder: string;
	// Text of the message being edited; the composer switches to edit mode.
	editing: string | null;
	onSend: (text: string) => void;
	/** Uploads and sends a recorded voice message; throws to keep the take. */
	onSendVoice: (take: VoiceTake) => Promise<void>;
	onCancelEdit: () => void;
	onTyping: () => void;
};

// The website's message box: a rounded card with the field and a square send
// button. Keeps its own draft state so typing never re-renders the thread.
export const Composer = memo(function Composer({
	placeholder,
	editing,
	onSend,
	onSendVoice,
	onCancelEdit,
	onTyping,
}: ComposerProps) {
	const { t } = useI18n();
	const { colors } = useTheme();
	const [text, setText] = useState("");
	const [recording, setRecording] = useState(false);
	const input = useRef<TextInputInstance>(null);
	const closeRecorder = useCallback(() => setRecording(false), []);

	const startRecording = async () => {
		const perm = await requestRecordingPermissionsAsync().catch(() => null);
		if (perm?.granted) {
			setRecording(true);
			return;
		}
		Alert.alert(t("chat.voiceMicDeniedTitle"), t("chat.voiceMicDenied"), [
			{ text: t("common.cancel"), style: "cancel" },
			{
				text: t("chat.voiceOpenSettings"),
				onPress: () => Linking.openSettings().catch(() => {}),
			},
		]);
	};

	useEffect(() => {
		if (editing === null) return;
		setText(editing);
		input.current?.focus();
	}, [editing]);

	const trimmed = text.trim();
	const canRecord = !trimmed && editing === null;
	const send = () => {
		if (!trimmed) return;
		onSend(trimmed);
		setText("");
	};

	return (
		<View className="gap-1.5 px-3 pb-2 pt-1">
			{editing !== null ? (
				<View className="flex-row items-center gap-2 px-2">
					<Icon as={Pencil} size={14} className="text-link" />
					<Text className="text-link flex-1 text-xs font-bold">
						{t("chat.editMessage")}
					</Text>
					<Pressable
						onPress={() => {
							setText("");
							onCancelEdit();
						}}
						hitSlop={10}
						accessibilityRole="button"
						accessibilityLabel={t("chat.editCancel")}
					>
						<Icon as={X} size={16} className="text-muted-foreground" />
					</Pressable>
				</View>
			) : null}
			{recording ? (
				<VoiceRecorderBar onSend={onSendVoice} onClose={closeRecorder} />
			) : (
				<View className="bg-card border-border flex-row items-end gap-2 rounded-3xl border p-1.5">
					<TextInput
						ref={input}
						value={text}
						onChangeText={(v) => {
							setText(v);
							if (v) onTyping();
						}}
						placeholder={placeholder}
						placeholderTextColor={colors["muted-foreground"]}
						multiline
						maxLength={10000}
						className="text-foreground font-sans max-h-32 min-h-10 flex-1 px-3 py-2 text-base"
						accessibilityLabel={placeholder}
					/>
					{canRecord ? (
						<Pressable
							onPress={startRecording}
							accessibilityRole="button"
							accessibilityLabel={t("chat.voiceRecord")}
							className="bg-primary active:opacity-80 h-10 w-10 items-center justify-center rounded-2xl"
						>
							<Icon as={Mic} size={20} className="text-primary-foreground" />
						</Pressable>
					) : (
						<Pressable
							onPress={send}
							disabled={!trimmed}
							accessibilityRole="button"
							accessibilityLabel={t("chat.send")}
							className={`bg-primary h-10 w-10 items-center justify-center rounded-2xl ${trimmed ? "" : "opacity-50"}`}
						>
							<Icon
								as={ArrowUp}
								size={20}
								className="text-primary-foreground"
							/>
						</Pressable>
					)}
				</View>
			)}
		</View>
	);
});
