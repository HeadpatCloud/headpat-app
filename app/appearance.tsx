import { router } from "expo-router";
import { Check, Pencil, Plus } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { tripletToHex } from "@/lib/theme/color";
import { PRESET_LIST, PRESETS } from "@/lib/theme/presets";
import { type ThemeMode, useTheme } from "@/lib/theme/provider";

const MODES: { value: ThemeMode; label: string }[] = [
	{ value: "system", label: "System" },
	{ value: "light", label: "Light" },
	{ value: "dark", label: "Dark" },
];

const SWATCH_KEYS = ["primary", "accent", "background"] as const;

export default function Appearance() {
	const { mode, setMode, scheme, activeTheme, setActiveTheme, customThemes } =
		useTheme();
	const insets = useSafeAreaInsets();

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerStyle={{
				padding: 16,
				paddingBottom: insets.bottom + 24,
				gap: 24,
			}}
		>
			<View className="gap-3">
				<Text variant="small" className="text-muted-foreground uppercase">
					Mode
				</Text>
				<View className="flex-row gap-2">
					{MODES.map((m) => {
						const selected = mode === m.value;
						return (
							<Pressable
								key={m.value}
								onPress={() => setMode(m.value)}
								accessibilityRole="radio"
								accessibilityState={{ selected }}
								accessibilityLabel={`${m.label} mode`}
								className={`flex-1 items-center rounded-md border px-3 py-3 ${selected ? "border-primary bg-primary/10" : "border-border bg-card"}`}
							>
								<Text
									className={
										selected ? "text-primary font-semibold" : "text-foreground"
									}
								>
									{m.label}
								</Text>
							</Pressable>
						);
					})}
				</View>
			</View>

			<View className="gap-3">
				<Text variant="small" className="text-muted-foreground uppercase">
					Theme
				</Text>
				<View className="gap-2">
					{PRESET_LIST.map((p) => {
						const selected = activeTheme === p.slug;
						const tokens = PRESETS[p.slug][scheme];
						return (
							<Pressable
								key={p.slug}
								onPress={() => setActiveTheme(p.slug)}
								accessibilityRole="button"
								accessibilityState={{ selected }}
								accessibilityLabel={`${p.name} theme`}
								className={`bg-card flex-row items-center justify-between rounded-lg border p-3 ${selected ? "border-primary" : "border-border"}`}
							>
								<View className="flex-row items-center gap-3">
									<View className="flex-row">
										{SWATCH_KEYS.map((key, i) => (
											<View
												key={key}
												style={{
													backgroundColor: tripletToHex(tokens[key]),
													marginLeft: i ? -6 : 0,
												}}
												className="border-border h-6 w-6 rounded-full border"
											/>
										))}
									</View>
									<Text className="text-foreground font-medium">{p.name}</Text>
								</View>
								{selected ? (
									<Check size={20} color={tripletToHex(tokens.primary)} />
								) : null}
							</Pressable>
						);
					})}
				</View>
			</View>

			<View className="gap-3">
				<Text variant="small" className="text-muted-foreground uppercase">
					Your themes
				</Text>
				<View className="gap-2">
					{customThemes.map((c) => {
						const id = `custom:${c.id}`;
						const selected = activeTheme === id;
						const hex = c[scheme]?.primary ?? "#000000";
						return (
							<View
								key={c.id}
								className={`bg-card flex-row items-center justify-between rounded-lg border p-3 ${selected ? "border-primary" : "border-border"}`}
							>
								<Pressable
									onPress={() => setActiveTheme(id)}
									accessibilityRole="button"
									accessibilityState={{ selected }}
									accessibilityLabel={`${c.name} theme`}
									className="flex-1 flex-row items-center gap-3"
								>
									<View
										style={{ backgroundColor: hex }}
										className="border-border h-6 w-6 rounded-full border"
									/>
									<Text className="text-foreground font-medium">{c.name}</Text>
								</Pressable>
								<View className="flex-row items-center gap-3">
									{selected ? <Check size={20} color={hex} /> : null}
									<Pressable
										onPress={() => router.push(`/theme-builder?id=${c.id}`)}
										accessibilityRole="button"
										accessibilityLabel={`Edit ${c.name}`}
										hitSlop={8}
									>
										<Icon
											as={Pencil}
											size={18}
											className="text-muted-foreground"
										/>
									</Pressable>
								</View>
							</View>
						);
					})}
					<Button
						variant="outline"
						onPress={() => router.push("/theme-builder")}
						accessibilityLabel="Create custom theme"
					>
						<Icon as={Plus} size={18} className="text-foreground" />
						<Text>Create custom theme</Text>
					</Button>
				</View>
			</View>
		</ScrollView>
	);
}
