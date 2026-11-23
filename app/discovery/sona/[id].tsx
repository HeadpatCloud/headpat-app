import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ImagePick } from "@/components/discovery/image-pick";
import { X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { Text } from "@/components/ui/text";
import { useDiscoveryOptions } from "@/lib/discovery-options";
import { useI18n } from "@/lib/i18n/provider";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

// Quick picks, since React Native has no built-in colour picker; any other
// colour can be typed as a hex code.
const PALETTE = [
	"#ffffff",
	"#d4d4d8",
	"#52525b",
	"#18181b",
	"#ef4444",
	"#f97316",
	"#f59e0b",
	"#eab308",
	"#84cc16",
	"#22c55e",
	"#14b8a6",
	"#06b6d4",
	"#3b82f6",
	"#6366f1",
	"#a855f7",
	"#ec4899",
	"#8b5a2b",
	"#c19a6b",
];

type Draft = {
	name: string;
	species: string | null;
	pronouns: string | null;
	description: string | null;
	avatarFileId: string | null;
	refSheetFileId: string | null;
	colors: string[];
};

const EMPTY: Draft = {
	name: "",
	species: null,
	pronouns: null,
	description: null,
	avatarFileId: null,
	refSheetFileId: null,
	colors: [],
};

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

export default function SonaEdit() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const isNew = id === "new";
	const { t } = useI18n();
	const insets = useSafeAreaInsets();
	const qc = useQueryClient();
	const mine = useQuery(orpc.discovery.mine.queryOptions({ input: {} }));
	const options = useDiscoveryOptions();
	const maxColors = options.maxSonaColors;
	const [d, setD] = useState<Draft>(EMPTY);
	const [hex, setHex] = useState("");
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (isNew) return;
		const s = mine.data?.sonas.find((x) => x.id === id);
		if (!s) return;
		setD({
			name: s.name,
			species: s.species,
			pronouns: s.pronouns,
			description: s.description,
			avatarFileId: s.avatarFileId,
			refSheetFileId: s.refSheetFileId,
			colors: s.colors,
		});
	}, [mine.data, id, isNew]);

	const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
		setD((cur) => ({ ...cur, [k]: v }));
	const text = (v: string) => (v.trim() ? v : null);
	const addColor = (c: string) => {
		const color = c.toLowerCase();
		if (!/^#[0-9a-f]{6}$/.test(color) || d.colors.length >= maxColors) return;
		if (!d.colors.includes(color)) set("colors", [...d.colors, color]);
	};

	const save = async () => {
		setBusy(true);
		try {
			const sona = { ...d, name: d.name.trim() };
			if (isNew) await client.discovery.sonas.create(sona);
			else await client.discovery.sonas.update({ id, sona });
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
			<View className="gap-4">
				<Field label={t("discovery.sonaName")}>
					<Input
						value={d.name}
						maxLength={80}
						onChangeText={(v) => set("name", v)}
					/>
				</Field>
				<Field label={t("discovery.sonaSpecies")}>
					<Input
						value={d.species ?? ""}
						maxLength={80}
						onChangeText={(v) => set("species", text(v))}
					/>
				</Field>
				<Field label={t("discovery.sonaPronouns")}>
					<Input
						value={d.pronouns ?? ""}
						maxLength={40}
						autoCapitalize="none"
						onChangeText={(v) => set("pronouns", text(v))}
					/>
				</Field>
				<Field label={t("discovery.sonaDescription")}>
					<Input
						value={d.description ?? ""}
						maxLength={2000}
						multiline
						className="min-h-28 py-3"
						textAlignVertical="top"
						onChangeText={(v) => set("description", text(v))}
					/>
				</Field>
				<ImagePick
					kind="avatar"
					square
					label={t("discovery.sonaPicture")}
					fileId={d.avatarFileId}
					onChange={(v) => set("avatarFileId", v)}
				/>
				<ImagePick
					kind="gallery"
					label={t("discovery.sonaRefSheet")}
					fileId={d.refSheetFileId}
					onChange={(v) => set("refSheetFileId", v)}
				/>
				<Field label={t("discovery.sonaColors")}>
					<View className="gap-3">
						{d.colors.length ? (
							<View className="flex-row flex-wrap gap-2">
								{d.colors.map((c) => (
									<Pressable
										key={c}
										onPress={() =>
											set(
												"colors",
												d.colors.filter((x) => x !== c),
											)
										}
										accessibilityRole="button"
										accessibilityLabel={`${t("discovery.removeColor")} ${c}`}
										className="border-border flex-row items-center gap-1.5 rounded-full border py-1 pl-1 pr-2"
									>
										<View
											className="border-border rounded-full border"
											style={{ width: 22, height: 22, backgroundColor: c }}
										/>
										<Text className="font-mono text-xs">{c}</Text>
										<Icon as={X} size={12} />
									</Pressable>
								))}
							</View>
						) : null}
						{d.colors.length < maxColors ? (
							<>
								<View className="flex-row flex-wrap gap-2">
									{PALETTE.map((c) => (
										<Pressable
											key={c}
											onPress={() => addColor(c)}
											accessibilityRole="button"
											accessibilityLabel={`${t("discovery.addColor")} ${c}`}
											className="border-border rounded-full border"
											style={{ width: 30, height: 30, backgroundColor: c }}
										/>
									))}
								</View>
								<View className="flex-row items-center gap-2">
									<Input
										containerClassName="flex-1"
										value={hex}
										placeholder="#7c3aed"
										autoCapitalize="none"
										maxLength={7}
										onChangeText={setHex}
									/>
									<Button
										size="sm"
										variant="secondary"
										onPress={() => {
											addColor(hex.startsWith("#") ? hex : `#${hex}`);
											setHex("");
										}}
									>
										<Text>{t("discovery.addColor")}</Text>
									</Button>
								</View>
							</>
						) : null}
					</View>
				</Field>
				<Button
					fullWidth
					loading={busy}
					disabled={busy || !d.name.trim()}
					onPress={save}
				>
					<Text>{t("discovery.save")}</Text>
				</Button>
			</View>
		</KeyboardAwareScrollView>
	);
}
