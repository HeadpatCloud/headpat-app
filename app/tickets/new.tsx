import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

const CATEGORIES = [
	{ value: "general", label: "General" },
	{ value: "account", label: "Account" },
	{ value: "technical", label: "Technical" },
	{ value: "report", label: "Report" },
	{ value: "other", label: "Other" },
] as const;

const PRIORITIES = [
	{ value: "low", label: "Low" },
	{ value: "normal", label: "Normal" },
	{ value: "high", label: "High" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];
type Priority = (typeof PRIORITIES)[number]["value"];

export default function NewTicket() {
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
			Alert.alert("Couldn't create ticket", humanizeError(e));
		} finally {
			setBusy(false);
		}
	};

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{
				padding: 16,
				paddingBottom: insets.bottom + 24,
				gap: 16,
			}}
			keyboardShouldPersistTaps="handled"
		>
			<View className="gap-1.5">
				<Text variant="small" className="text-muted-foreground">
					Subject
				</Text>
				<Input
					placeholder="Brief summary"
					value={subject}
					onChangeText={setSubject}
					accessibilityLabel="Subject"
				/>
			</View>

			<View className="gap-1.5">
				<Text variant="small" className="text-muted-foreground">
					Message
				</Text>
				<Input
					placeholder="Describe your issue"
					value={body}
					onChangeText={setBody}
					multiline
					className="h-32"
					accessibilityLabel="Message"
				/>
			</View>

			<View className="gap-3">
				<Text variant="small" className="text-muted-foreground uppercase">
					Category
				</Text>
				<View className="flex-row flex-wrap gap-2">
					{CATEGORIES.map((c) => {
						const selected = category === c.value;
						return (
							<Pressable
								key={c.value}
								onPress={() => setCategory(c.value)}
								accessibilityRole="radio"
								accessibilityState={{ selected }}
								accessibilityLabel={`${c.label} category`}
								className={`rounded-md border px-3 py-2 ${selected ? "border-primary bg-primary/10" : "border-border bg-card"}`}
							>
								<Text
									className={
										selected ? "text-primary font-semibold" : "text-foreground"
									}
								>
									{c.label}
								</Text>
							</Pressable>
						);
					})}
				</View>
			</View>

			<View className="gap-3">
				<Text variant="small" className="text-muted-foreground uppercase">
					Priority
				</Text>
				<View className="flex-row gap-2">
					{PRIORITIES.map((p) => {
						const selected = priority === p.value;
						return (
							<Pressable
								key={p.value}
								onPress={() => setPriority(p.value)}
								accessibilityRole="radio"
								accessibilityState={{ selected }}
								accessibilityLabel={`${p.label} priority`}
								className={`flex-1 items-center rounded-md border px-3 py-2 ${selected ? "border-primary bg-primary/10" : "border-border bg-card"}`}
							>
								<Text
									className={
										selected ? "text-primary font-semibold" : "text-foreground"
									}
								>
									{p.label}
								</Text>
							</Pressable>
						);
					})}
				</View>
			</View>

			<Button
				disabled={!canSubmit}
				onPress={submit}
				accessibilityRole="button"
				accessibilityLabel="Submit ticket"
				className="mt-2"
			>
				<Text>{busy ? "Submitting…" : "Submit ticket"}</Text>
			</Button>
		</ScrollView>
	);
}
