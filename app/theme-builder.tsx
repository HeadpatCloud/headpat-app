import { router, useLocalSearchParams } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { client } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { tripletToHex } from "@/lib/theme/color";
import { PRESETS } from "@/lib/theme/presets";
import { useTheme } from "@/lib/theme/provider";
import { TOKEN_GROUPS, TOKEN_KEYS, type TokenKey } from "@/lib/theme/tokens";

type HexMap = Record<TokenKey, string>;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Build a complete 22-key hex map, taking valid values from `src` and falling
// back to the headpat preset so the result always satisfies theme.create/update.
function buildHexMap(
	src: Record<string, string> | undefined,
	variant: "light" | "dark",
): HexMap {
	const out = {} as HexMap;
	for (const k of TOKEN_KEYS) {
		const v = src?.[k];
		out[k] =
			v && HEX_RE.test(v) ? v : tripletToHex(PRESETS.headpat[variant][k]);
	}
	return out;
}

export default function ThemeBuilder() {
	const insets = useSafeAreaInsets();
	const { id } = useLocalSearchParams<{ id?: string }>();
	const { customThemes, refreshCustomThemes, setActiveTheme } = useTheme();
	const editing = id ? customThemes.find((t) => t.id === id) : undefined;

	const [name, setName] = useState(editing?.name ?? "My theme");
	const [variant, setVariant] = useState<"light" | "dark">("light");
	const [light, setLight] = useState<HexMap>(() =>
		buildHexMap(editing?.light, "light"),
	);
	const [dark, setDark] = useState<HexMap>(() =>
		buildHexMap(editing?.dark, "dark"),
	);
	const [busy, setBusy] = useState(false);

	const draft = variant === "light" ? light : dark;
	const setToken = (key: TokenKey, value: string) => {
		const next = { ...draft, [key]: value };
		(variant === "light" ? setLight : setDark)(next);
	};

	const valid = useMemo(
		() =>
			name.trim().length > 0 &&
			TOKEN_KEYS.every((k) => HEX_RE.test(light[k]) && HEX_RE.test(dark[k])),
		[name, light, dark],
	);

	const save = async () => {
		setBusy(true);
		try {
			if (editing) {
				await client.theme.update({
					id: editing.id,
					name: name.trim(),
					light,
					dark,
				});
			} else {
				const created = await client.theme.create({
					name: name.trim(),
					light,
					dark,
				});
				setActiveTheme(`custom:${created.id}`);
			}
			await refreshCustomThemes();
			router.back();
		} catch (e) {
			Alert.alert("Couldn't save theme", humanizeError(e));
		} finally {
			setBusy(false);
		}
	};

	const remove = () => {
		if (!editing) return;
		Alert.alert("Delete theme", `Delete "${editing.name}"?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					try {
						await client.theme.delete({ id: editing.id });
						await refreshCustomThemes();
						router.back();
					} catch (e) {
						Alert.alert("Couldn't delete", humanizeError(e));
					}
				},
			},
		]);
	};

	return (
		<View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
			<ScrollView
				contentContainerStyle={{
					padding: 16,
					paddingBottom: insets.bottom + 96,
					gap: 20,
				}}
			>
				<View className="gap-2">
					<Text variant="small" className="text-muted-foreground uppercase">
						Name
					</Text>
					<Input
						value={name}
						onChangeText={setName}
						accessibilityLabel="Theme name"
					/>
				</View>

				<Preview hex={draft} />

				<View className="flex-row gap-2">
					{(["light", "dark"] as const).map((v) => {
						const selected = variant === v;
						return (
							<Pressable
								key={v}
								onPress={() => setVariant(v)}
								accessibilityRole="radio"
								accessibilityState={{ selected }}
								accessibilityLabel={`Edit ${v} colors`}
								className={`flex-1 items-center rounded-md border px-3 py-2 ${selected ? "border-primary bg-primary/10" : "border-border bg-card"}`}
							>
								<Text
									className={
										selected ? "text-primary font-semibold" : "text-foreground"
									}
								>
									{v === "light" ? "Light" : "Dark"}
								</Text>
							</Pressable>
						);
					})}
				</View>

				{TOKEN_GROUPS.map((group) => (
					<View key={group.label} className="gap-2">
						<Text variant="small" className="text-muted-foreground uppercase">
							{group.label}
						</Text>
						{group.keys.map((key) => (
							<View key={key} className="flex-row items-center gap-3">
								<View
									style={{
										backgroundColor: HEX_RE.test(draft[key])
											? draft[key]
											: "#000",
									}}
									className="border-border h-8 w-8 rounded-md border"
								/>
								<Text className="text-foreground flex-1 text-sm">{key}</Text>
								<TextInput
									value={draft[key]}
									onChangeText={(t) => setToken(key, t)}
									autoCapitalize="none"
									autoCorrect={false}
									accessibilityLabel={`${key} hex color`}
									className={`text-foreground w-28 rounded-md border px-2 py-1.5 text-sm ${HEX_RE.test(draft[key]) ? "border-border" : "border-destructive"}`}
									placeholder="#000000"
									placeholderTextColor="rgb(115 115 115)"
								/>
							</View>
						))}
					</View>
				))}
			</ScrollView>

			<View
				className="border-border bg-background flex-row gap-3 border-t p-4"
				style={{ paddingBottom: insets.bottom + 12 }}
			>
				{editing ? (
					<Button
						variant="outline"
						onPress={remove}
						accessibilityLabel="Delete theme"
						className="aspect-square p-0"
					>
						<Icon as={Trash2} size={20} className="text-destructive" />
					</Button>
				) : null}
				<Button
					disabled={!valid || busy}
					onPress={save}
					className="flex-1"
					accessibilityLabel="Save theme"
				>
					<Text>{busy ? "Saving…" : "Save theme"}</Text>
				</Button>
			</View>
		</View>
	);
}

function Preview({ hex }: { hex: HexMap }) {
	return (
		<View
			style={{ backgroundColor: hex.background, borderColor: hex.border }}
			className="gap-3 rounded-xl border p-4"
		>
			<Text style={{ color: hex.foreground }} className="text-lg font-semibold">
				Preview
			</Text>
			<View
				style={{ backgroundColor: hex.card, borderColor: hex.border }}
				className="gap-2 rounded-lg border p-3"
			>
				<Text style={{ color: hex["card-foreground"] }}>Card surface</Text>
				<Text style={{ color: hex["muted-foreground"] }} className="text-sm">
					Muted caption text
				</Text>
				<View className="flex-row gap-2 pt-1">
					<View
						style={{ backgroundColor: hex.primary }}
						className="rounded-md px-3 py-2"
					>
						<Text
							style={{ color: hex["primary-foreground"] }}
							className="text-sm font-medium"
						>
							Primary
						</Text>
					</View>
					<View
						style={{ backgroundColor: hex.accent }}
						className="rounded-md px-3 py-2"
					>
						<Text
							style={{ color: hex["accent-foreground"] }}
							className="text-sm font-medium"
						>
							Accent
						</Text>
					</View>
				</View>
			</View>
		</View>
	);
}
