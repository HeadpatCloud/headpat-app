import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Gradient } from "@/components/ui/gradient";
import { GradientText } from "@/components/ui/gradient-text";
import { Input } from "@/components/ui/input";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { useTheme } from "@/lib/theme/provider";
import { cn } from "@/lib/utils";

const CATEGORIES = [
	"general",
	"account",
	"technical",
	"report",
	"other",
] as const;

const PRIORITIES = ["low", "normal", "high"] as const;

type Category = (typeof CATEGORIES)[number];
type Priority = (typeof PRIORITIES)[number];

function Chip({
	label,
	selected,
	onPress,
	accessibilityLabel,
	className,
}: {
	label: string;
	selected: boolean;
	onPress: () => void;
	accessibilityLabel: string;
	className?: string;
}) {
	const { colors } = useTheme();
	return (
		<PressableScale
			onPress={onPress}
			haptic="selection"
			accessibilityRole="radio"
			accessibilityState={{ selected }}
			accessibilityLabel={accessibilityLabel}
			className={className}
		>
			<View
				className={cn(
					"min-h-11 items-center justify-center overflow-hidden rounded-xl border px-3 py-2",
					selected ? "border-transparent" : "border-border bg-card",
				)}
			>
				{selected ? (
					<Gradient style={StyleSheet.absoluteFill} pointerEvents="none" />
				) : null}
				<Text
					className={selected ? "font-semibold" : "text-foreground"}
					style={selected ? { color: colors["primary-foreground"] } : undefined}
				>
					{label}
				</Text>
			</View>
		</PressableScale>
	);
}

export default function NewTicket() {
	const { t } = useI18n();
	const insets = useSafeAreaInsets();
	const qc = useQueryClient();
	const [subject, setSubject] = useState("");
	const [body, setBody] = useState("");
	const [category, setCategory] = useState<Category>("general");
	const [priority, setPriority] = useState<Priority>("normal");
	const [busy, setBusy] = useState(false);

	const canSubmit =
		subject.trim().length > 0 && body.trim().length > 0 && !busy;

	const submit = async () => {
		if (!canSubmit) return;
		setBusy(true);
		try {
			const created = await client.ticket.create({
				subject: subject.trim(),
				body: body.trim(),
				category,
				priority,
			});
			qc.invalidateQueries({ queryKey: orpc.ticket.myList.key() });
			router.replace(`/tickets/${created.id}`);
		} catch (e) {
			Alert.alert(t("tickets.new.createError"), humanizeError(e));
		} finally {
			setBusy(false);
		}
	};

	return (
		<KeyboardAwareScrollView
			className="bg-background flex-1"
			contentContainerStyle={{
				padding: 16,
				paddingBottom: insets.bottom + 24,
				gap: 16,
			}}
			keyboardShouldPersistTaps="handled"
		>
			<AnimatedEntrance index={0}>
				<GradientText className="text-3xl font-extrabold leading-9 tracking-tight">
					{t("tickets.new.heading")}
				</GradientText>
			</AnimatedEntrance>

			<AnimatedEntrance index={1} className="gap-1.5">
				<Text variant="small" className="text-muted-foreground">
					{t("tickets.new.subject")}
				</Text>
				<Input
					placeholder={t("tickets.new.subjectPlaceholder")}
					value={subject}
					onChangeText={setSubject}
					accessibilityLabel={t("tickets.new.subject")}
				/>
			</AnimatedEntrance>

			<AnimatedEntrance index={2} className="gap-1.5">
				<Text variant="small" className="text-muted-foreground">
					{t("tickets.new.message")}
				</Text>
				<Input
					placeholder={t("tickets.new.messagePlaceholder")}
					value={body}
					onChangeText={setBody}
					multiline
					className="h-32"
					accessibilityLabel={t("tickets.new.message")}
				/>
			</AnimatedEntrance>

			<AnimatedEntrance index={3} className="gap-3">
				<Text variant="caption">{t("tickets.new.category")}</Text>
				<View className="flex-row flex-wrap gap-2">
					{CATEGORIES.map((c) => (
						<Chip
							key={c}
							label={t(`tickets.category.${c}`)}
							selected={category === c}
							onPress={() => setCategory(c)}
							accessibilityLabel={t("tickets.new.categoryA11y", {
								label: t(`tickets.category.${c}`),
							})}
						/>
					))}
				</View>
			</AnimatedEntrance>

			<AnimatedEntrance index={4} className="gap-3">
				<Text variant="caption">{t("tickets.new.priority")}</Text>
				<View className="flex-row gap-2">
					{PRIORITIES.map((p) => (
						<Chip
							key={p}
							label={t(`tickets.priority.${p}`)}
							selected={priority === p}
							onPress={() => setPriority(p)}
							accessibilityLabel={t("tickets.new.priorityA11y", {
								label: t(`tickets.priority.${p}`),
							})}
							className="flex-1"
						/>
					))}
				</View>
			</AnimatedEntrance>

			<AnimatedEntrance index={5}>
				<Button
					disabled={!canSubmit}
					loading={busy}
					onPress={submit}
					accessibilityRole="button"
					accessibilityLabel={t("tickets.new.submit")}
					className="mt-2"
				>
					<Text>{t("tickets.new.submit")}</Text>
				</Button>
			</AnimatedEntrance>
		</KeyboardAwareScrollView>
	);
}
