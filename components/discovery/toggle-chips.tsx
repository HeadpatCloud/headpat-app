import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export function Chip({
	label,
	active,
	onPress,
}: {
	label: string;
	active: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityState={{ selected: active }}
			className={cn(
				"rounded-full border px-3 py-1.5",
				active ? "border-primary bg-primary/15" : "border-border",
			)}
		>
			<Text
				className={cn(
					"text-xs font-medium",
					active ? "text-primary" : "text-muted-foreground",
				)}
			>
				{label}
			</Text>
		</Pressable>
	);
}

/** Multi-select chips over a fixed set of keys. */
export function ToggleChips<K extends string>({
	options,
	value,
	onChange,
	label,
}: {
	options: readonly K[];
	value: K[];
	onChange: (v: K[]) => void;
	label: (key: K) => string;
}) {
	return (
		<View className="flex-row flex-wrap gap-2">
			{options.map((key) => {
				const on = value.includes(key);
				return (
					<Chip
						key={key}
						label={label(key)}
						active={on}
						onPress={() =>
							onChange(on ? value.filter((v) => v !== key) : [...value, key])
						}
					/>
				);
			})}
		</View>
	);
}

/** Read-only pills, for showing tags on a profile. */
export function Pills({
	items,
	tone = "muted",
}: {
	items: string[];
	tone?: "muted" | "primary";
}) {
	return (
		<View className="flex-row flex-wrap gap-1.5">
			{items.map((item) => (
				<View
					key={item}
					className={cn(
						"rounded-full px-2.5 py-1",
						tone === "primary" ? "bg-primary/15" : "bg-muted",
					)}
				>
					<Text
						className={cn(
							"text-xs font-medium",
							tone === "primary" ? "text-primary" : "text-foreground",
						)}
					>
						{item}
					</Text>
				</View>
			))}
		</View>
	);
}
