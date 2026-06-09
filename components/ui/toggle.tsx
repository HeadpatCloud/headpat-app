import { Pressable, View } from "react-native";

export function Toggle({
	value,
	onValueChange,
	accessibilityLabel,
}: {
	value: boolean;
	onValueChange: (v: boolean) => void;
	accessibilityLabel?: string;
}) {
	return (
		<Pressable
			onPress={() => onValueChange(!value)}
			accessibilityRole="switch"
			accessibilityState={{ checked: value }}
			accessibilityLabel={accessibilityLabel}
			className={`h-7 w-12 justify-center rounded-full p-0.5 ${value ? "bg-primary" : "bg-muted"}`}
		>
			<View
				className={`h-6 w-6 rounded-full bg-white shadow ${value ? "ml-auto" : ""}`}
			/>
		</Pressable>
	);
}
