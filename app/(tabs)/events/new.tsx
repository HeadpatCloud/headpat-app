import DateTimePicker, {
	type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { router } from "expo-router";
import { CalendarClock } from "lucide-react-native";
import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

function roundedHour(offsetHours: number) {
	const d = new Date();
	d.setHours(d.getHours() + offsetHours, 0, 0, 0);
	return d;
}

export default function NewEvent() {
	const insets = useSafeAreaInsets();
	const qc = useQueryClient();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [startsAt, setStartsAt] = useState(() => roundedHour(1));
	const [endsAt, setEndsAt] = useState<Date | null>(null);
	const [locationText, setLocationText] = useState("");
	const [isPublic, setIsPublic] = useState(true);
	const [tags, setTags] = useState("");
	const [busy, setBusy] = useState(false);
	const [picking, setPicking] = useState<"start" | "end" | null>(null);

	const onPickStart = (e: DateTimePickerEvent, date?: Date) => {
		if (Platform.OS === "android") setPicking(null);
		if (e.type === "dismissed" || !date) return;
		setStartsAt(date);
		if (endsAt && endsAt < date) setEndsAt(null);
	};

	const onPickEnd = (e: DateTimePickerEvent, date?: Date) => {
		if (Platform.OS === "android") setPicking(null);
		if (e.type === "dismissed" || !date) return;
		setEndsAt(date);
	};

	const submit = async () => {
		if (title.trim().length === 0) return;
		if (endsAt && endsAt < startsAt) {
			Alert.alert(
				"Invalid dates",
				"The end time must be after the start time.",
			);
			return;
		}
		setBusy(true);
		try {
			const created = await client.event.create({
				title: title.trim(),
				description: description.trim() || undefined,
				startsAt,
				endsAt: endsAt ?? undefined,
				locationText: locationText.trim() || undefined,
				isPublic,
				tags: tags
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean),
			});
			await qc.invalidateQueries({ queryKey: orpc.event.list.key() });
			router.replace(`/events/${created.id}`);
		} catch (e) {
			Alert.alert("Couldn't create event", humanizeError(e));
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
			<Field label="Title">
				<Input
					placeholder="Event title"
					value={title}
					onChangeText={setTitle}
					accessibilityLabel="Title"
				/>
			</Field>

			<Field label="Description">
				<Input
					placeholder="What's it about? (optional)"
					value={description}
					onChangeText={setDescription}
					multiline
					className="h-24"
					accessibilityLabel="Description"
				/>
			</Field>

			<Field label="Starts">
				<Button
					variant="outline"
					onPress={() => setPicking(picking === "start" ? null : "start")}
					accessibilityRole="button"
					accessibilityLabel="Pick start date and time"
				>
					<Icon as={CalendarClock} size={18} className="text-foreground" />
					<Text>{format(startsAt, "PPP p")}</Text>
				</Button>
				{picking === "start" ? (
					<DateTimePicker
						value={startsAt}
						mode="datetime"
						display={Platform.OS === "ios" ? "spinner" : "default"}
						onChange={onPickStart}
					/>
				) : null}
			</Field>

			<Field label="Ends">
				<Button
					variant="outline"
					onPress={() => setPicking(picking === "end" ? null : "end")}
					accessibilityRole="button"
					accessibilityLabel="Pick end date and time"
				>
					<Icon as={CalendarClock} size={18} className="text-foreground" />
					<Text>{endsAt ? format(endsAt, "PPP p") : "No end time"}</Text>
				</Button>
				{endsAt ? (
					<Pressable
						onPress={() => setEndsAt(null)}
						accessibilityRole="button"
						accessibilityLabel="Clear end time"
						hitSlop={8}
						className="self-start"
					>
						<Text variant="small" className="text-muted-foreground">
							Clear end time
						</Text>
					</Pressable>
				) : null}
				{picking === "end" ? (
					<DateTimePicker
						value={endsAt ?? startsAt}
						mode="datetime"
						minimumDate={startsAt}
						display={Platform.OS === "ios" ? "spinner" : "default"}
						onChange={onPickEnd}
					/>
				) : null}
			</Field>

			<Field label="Location">
				<Input
					placeholder="Where is it? (optional)"
					value={locationText}
					onChangeText={setLocationText}
					accessibilityLabel="Location"
				/>
			</Field>

			<Field label="Tags">
				<Input
					placeholder="Tags, comma separated"
					value={tags}
					onChangeText={setTags}
					autoCapitalize="none"
					accessibilityLabel="Tags"
				/>
			</Field>

			<View className="flex-row items-center justify-between pt-1">
				<Text className="text-foreground flex-1">Public event</Text>
				<Toggle
					value={isPublic}
					onValueChange={setIsPublic}
					accessibilityLabel="Public event"
				/>
			</View>

			<Button
				disabled={title.trim().length === 0 || busy}
				onPress={submit}
				accessibilityRole="button"
				accessibilityLabel="Create event"
				className="mt-2"
			>
				<Text>{busy ? "Creating…" : "Create event"}</Text>
			</Button>
		</ScrollView>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<View className="gap-1.5">
			<Text variant="small" className="text-muted-foreground">
				{label}
			</Text>
			{children}
		</View>
	);
}
