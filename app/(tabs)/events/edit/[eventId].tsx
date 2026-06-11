import DateTimePicker, {
	DateTimePickerAndroid,
	type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns/format";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarClock } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

export default function EditEvent() {
	const { eventId } = useLocalSearchParams<{ eventId: string }>();
	const insets = useSafeAreaInsets();
	const qc = useQueryClient();
	const { t } = useI18n();

	const { data, isLoading } = useQuery(
		orpc.event.byId.queryOptions({ input: { eventId } }),
	);

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [startsAt, setStartsAt] = useState(new Date());
	const [endsAt, setEndsAt] = useState<Date | null>(null);
	const [locationText, setLocationText] = useState("");
	const [isPublic, setIsPublic] = useState(true);
	const [tags, setTags] = useState("");
	const [busy, setBusy] = useState(false);
	const [picking, setPicking] = useState<"start" | "end" | null>(null);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		if (!data || loaded) return;
		setTitle(data.title);
		setDescription(data.description ?? "");
		setStartsAt(new Date(data.startsAt));
		setEndsAt(data.endsAt ? new Date(data.endsAt) : null);
		setLocationText(data.locationText ?? "");
		setIsPublic(data.isPublic);
		setTags(data.tags.join(", "));
		setLoaded(true);
	}, [data, loaded]);

	// Android has no "datetime" mode (mounting the component with it crashes on
	// unmount) — chain the imperative date dialog into the time dialog instead.
	const openAndroidDateTime = (
		initial: Date,
		minimumDate: Date | undefined,
		onPicked: (date: Date) => void,
	) => {
		DateTimePickerAndroid.open({
			value: initial,
			mode: "date",
			minimumDate,
			onValueChange: (_e, date) => {
				if (!date) return;
				DateTimePickerAndroid.open({
					value: date,
					mode: "time",
					onValueChange: (_e2, withTime) => {
						if (withTime) onPicked(withTime);
					},
				});
			},
		});
	};

	const pickStart = () => {
		if (Platform.OS === "android") {
			openAndroidDateTime(startsAt, undefined, (date) => {
				setStartsAt(date);
				setEndsAt((prev) => (prev && prev < date ? null : prev));
			});
			return;
		}
		setPicking(picking === "start" ? null : "start");
	};

	const pickEnd = () => {
		if (Platform.OS === "android") {
			openAndroidDateTime(endsAt ?? startsAt, startsAt, setEndsAt);
			return;
		}
		setPicking(picking === "end" ? null : "end");
	};

	const onPickStart = (e: DateTimePickerEvent, date?: Date) => {
		if (e.type === "dismissed" || !date) return;
		setStartsAt(date);
		setEndsAt((prev) => (prev && prev < date ? null : prev));
	};

	const onPickEnd = (e: DateTimePickerEvent, date?: Date) => {
		if (e.type === "dismissed" || !date) return;
		setEndsAt(date);
	};

	const submit = async () => {
		if (title.trim().length === 0) return;
		if (endsAt && endsAt < startsAt) {
			Alert.alert(
				t("events.form.invalidDates"),
				t("events.form.invalidDatesBody"),
			);
			return;
		}
		setBusy(true);
		try {
			await client.event.update({
				eventId,
				title: title.trim(),
				description: description.trim() || null,
				startsAt,
				endsAt,
				locationText: locationText.trim() || null,
				isPublic,
				tags: tags
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean),
			});
			qc.invalidateQueries({
				queryKey: orpc.event.byId.key({ input: { eventId } }),
			});
			qc.invalidateQueries({ queryKey: orpc.event.list.key() });
			qc.invalidateQueries({ queryKey: orpc.event.upcoming.key() });
			router.back();
		} catch (e) {
			Alert.alert(t("events.form.updateFailed"), humanizeError(e));
		} finally {
			setBusy(false);
		}
	};

	if (isLoading || !loaded) {
		return (
			<View className="bg-background flex-1 gap-3 p-4">
				<Skeleton className="h-14 w-full rounded-xl" />
				<Skeleton className="h-12 w-2/3 rounded-xl" />
				<Skeleton className="h-24 w-full rounded-xl" />
			</View>
		);
	}

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
			<AnimatedEntrance index={0}>
				<Field label={t("events.form.title")}>
					<Input
						placeholder={t("events.form.titlePlaceholder")}
						value={title}
						onChangeText={setTitle}
						className="h-14 text-xl font-semibold"
						accessibilityLabel={t("events.form.title")}
					/>
				</Field>
			</AnimatedEntrance>

			<AnimatedEntrance index={1}>
				<Field label={t("events.form.starts")}>
					<Button
						variant="outline"
						onPress={pickStart}
						accessibilityRole="button"
						accessibilityLabel={t("events.form.pickStart")}
					>
						<Icon as={CalendarClock} size={18} className="text-foreground" />
						<Text>{format(startsAt, "PPP p")}</Text>
					</Button>
					{picking === "start" ? (
						<AnimatedEntrance>
							<DateTimePicker
								value={startsAt}
								mode="datetime"
								display="spinner"
								onChange={onPickStart}
							/>
						</AnimatedEntrance>
					) : null}
				</Field>
			</AnimatedEntrance>

			<AnimatedEntrance index={2}>
				<Field label={t("events.form.description")}>
					<Input
						placeholder={t("events.form.descriptionPlaceholder")}
						value={description}
						onChangeText={setDescription}
						multiline
						className="h-24"
						accessibilityLabel={t("events.form.description")}
					/>
				</Field>
			</AnimatedEntrance>

			<AnimatedEntrance index={3}>
				<Field label={t("events.form.ends")}>
					<Button
						variant="outline"
						onPress={pickEnd}
						accessibilityRole="button"
						accessibilityLabel={t("events.form.pickEnd")}
					>
						<Icon as={CalendarClock} size={18} className="text-foreground" />
						<Text>
							{endsAt ? format(endsAt, "PPP p") : t("events.form.noEnd")}
						</Text>
					</Button>
					{endsAt ? (
						<PressableScale
							onPress={() => setEndsAt(null)}
							accessibilityRole="button"
							accessibilityLabel={t("events.form.clearEnd")}
							hitSlop={8}
							className="self-start"
						>
							<Text variant="small" className="text-muted-foreground">
								{t("events.form.clearEnd")}
							</Text>
						</PressableScale>
					) : null}
					{picking === "end" ? (
						<AnimatedEntrance>
							<DateTimePicker
								value={endsAt ?? startsAt}
								mode="datetime"
								minimumDate={startsAt}
								display="spinner"
								onChange={onPickEnd}
							/>
						</AnimatedEntrance>
					) : null}
				</Field>
			</AnimatedEntrance>

			<AnimatedEntrance index={4}>
				<Field label={t("events.form.location")}>
					<Input
						placeholder={t("events.form.locationPlaceholder")}
						value={locationText}
						onChangeText={setLocationText}
						accessibilityLabel={t("events.form.location")}
					/>
				</Field>
			</AnimatedEntrance>

			<AnimatedEntrance index={5}>
				<Field label={t("events.form.tags")}>
					<Input
						placeholder={t("events.form.tagsPlaceholder")}
						value={tags}
						onChangeText={setTags}
						autoCapitalize="none"
						accessibilityLabel={t("events.form.tags")}
					/>
				</Field>
			</AnimatedEntrance>

			<AnimatedEntrance index={6}>
				<View className="flex-row items-center justify-between pt-1">
					<Text className="text-foreground flex-1">
						{t("events.form.public")}
					</Text>
					<Toggle
						value={isPublic}
						onValueChange={setIsPublic}
						accessibilityLabel={t("events.form.public")}
					/>
				</View>
			</AnimatedEntrance>

			<AnimatedEntrance index={7}>
				<Button
					fullWidth
					disabled={title.trim().length === 0 || busy}
					loading={busy}
					onPress={submit}
					accessibilityRole="button"
					accessibilityLabel={t("common.save")}
					className="mt-2"
				>
					<Text>{t("common.save")}</Text>
				</Button>
			</AnimatedEntrance>
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
			<Text variant="caption">{label}</Text>
			{children}
		</View>
	);
}
