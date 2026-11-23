import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { X } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { orpc } from "@/lib/orpc";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { Chip } from "./toggle-chips";

function clean(tag: string): string {
	return tag.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 32);
}

// Free tags with suggestions from what others already use, so spelling
// converges without a fixed list.
export function TagInput({
	value,
	onChange,
	kind,
	max,
	placeholder,
	label,
}: {
	value: string[];
	onChange: (tags: string[]) => void;
	kind: "interest" | "into";
	max: number;
	placeholder: string;
	label: string;
}) {
	const [draft, setDraft] = useState("");
	const prefix = useDebouncedValue(clean(draft), 200);
	const suggestions = useQuery({
		...orpc.discovery.suggestTags.queryOptions({ input: { kind, prefix } }),
		enabled: prefix.length > 0,
		staleTime: 60_000,
	});
	const full = value.length >= max;

	const add = (raw: string) => {
		const tag = clean(raw);
		setDraft("");
		if (!tag || value.includes(tag) || full) return;
		onChange([...value, tag]);
	};
	const options = (suggestions.data ?? []).filter((s) => !value.includes(s));

	return (
		<View className="gap-2">
			{value.length ? (
				<View className="flex-row flex-wrap gap-1.5">
					{value.map((tag) => (
						<Pressable
							key={tag}
							onPress={() => onChange(value.filter((v) => v !== tag))}
							accessibilityRole="button"
							accessibilityLabel={`${label}: ${tag}`}
							className="bg-primary/15 flex-row items-center gap-1 rounded-full px-2.5 py-1"
						>
							<Text className="text-primary text-xs font-medium">{tag}</Text>
							<Icon as={X} size={12} className="text-primary" />
						</Pressable>
					))}
				</View>
			) : null}
			<Input
				value={draft}
				editable={!full}
				placeholder={placeholder}
				accessibilityLabel={label}
				maxLength={32}
				autoCapitalize="none"
				returnKeyType="done"
				blurOnSubmit={false}
				onChangeText={(v) => {
					if (v.endsWith(",")) add(v.slice(0, -1));
					else setDraft(v);
				}}
				onSubmitEditing={() => add(draft)}
			/>
			{options.length > 0 && draft ? (
				<View className="flex-row flex-wrap gap-1.5">
					{options.map((s) => (
						<Chip
							key={s}
							label={`+ ${s}`}
							active={false}
							onPress={() => add(s)}
						/>
					))}
				</View>
			) : null}
		</View>
	);
}
