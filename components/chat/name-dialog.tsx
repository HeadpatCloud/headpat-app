import { forwardRef, useImperativeHandle, useState } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";

export type NamePrompt = {
	title: string;
	initial?: string;
	placeholder: string;
	confirmLabel: string;
	maxLength: number;
	onSubmit: (name: string) => void;
};

export type NameDialogHandle = { open: (prompt: NamePrompt) => void };

// Asks for a name (folders and channels) in a small centred dialog like the
// website's, which stays clear of the keyboard. Android has no Alert.prompt.
export const NameDialog = forwardRef<NameDialogHandle>(
	function NameDialog(_props, ref) {
		const { t } = useI18n();
		const { colors } = useTheme();
		const [prompt, setPrompt] = useState<NamePrompt | null>(null);
		const [value, setValue] = useState("");

		useImperativeHandle(ref, () => ({
			open: (next) => {
				setValue(next.initial ?? "");
				setPrompt(next);
			},
		}));

		const close = () => setPrompt(null);
		const trimmed = value.trim();
		const submit = () => {
			if (!prompt || !trimmed) return;
			close();
			prompt.onSubmit(trimmed);
		};

		return (
			<Modal
				visible={prompt !== null}
				transparent
				animationType="fade"
				statusBarTranslucent
				onRequestClose={close}
			>
				<KeyboardAvoidingView behavior="padding" className="flex-1">
					<Pressable
						onPress={close}
						accessibilityRole="button"
						accessibilityLabel={t("common.cancel")}
						className="flex-1 items-center justify-center bg-black/40 px-6"
					>
						{/* Catches taps so pressing the card itself doesn't close it. */}
						<Pressable
							onPress={() => {}}
							accessible={false}
							className="bg-card border-border w-full max-w-sm gap-4 rounded-3xl border p-5"
						>
							<Text variant="large" accessibilityRole="header">
								{prompt?.title}
							</Text>
							<TextInput
								value={value}
								onChangeText={setValue}
								placeholder={prompt?.placeholder}
								placeholderTextColor={colors["muted-foreground"]}
								maxLength={prompt?.maxLength}
								autoFocus
								selectTextOnFocus
								returnKeyType="done"
								onSubmitEditing={submit}
								accessibilityLabel={prompt?.placeholder}
								className="border-border bg-input text-foreground font-sans h-11 rounded-xl border px-3"
							/>
							<View className="flex-row justify-end gap-2">
								<Button variant="outline" onPress={close}>
									<Text>{t("common.cancel")}</Text>
								</Button>
								<Button disabled={!trimmed} onPress={submit}>
									<Text>{prompt?.confirmLabel}</Text>
								</Button>
							</View>
						</Pressable>
					</Pressable>
				</KeyboardAvoidingView>
			</Modal>
		);
	},
);
