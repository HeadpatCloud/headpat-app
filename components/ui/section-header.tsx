import { View } from "react-native";
import { Gradient } from "@/components/ui/gradient";
import { Text } from "@/components/ui/text";
import { PressableScale } from "@/lib/motion/pressable-scale";

type SectionHeaderProps = {
	title: string;
	subtitle?: string;
	action?: { label: string; onPress: () => void };
	accent?: boolean;
};

export function SectionHeader({
	title,
	subtitle,
	action,
	accent = false,
}: SectionHeaderProps) {
	return (
		<View className="flex-row items-start justify-between gap-3 py-2">
			<View className="flex-1 flex-row items-start gap-2.5">
				{accent ? (
					<Gradient
						borderRadius={2}
						style={{ width: 3, height: 18, marginTop: 4 }}
					/>
				) : null}
				<View className="flex-1">
					<Text className="text-xl font-semibold tracking-tight">{title}</Text>
					{subtitle ? (
						<Text variant="muted" className="mt-0.5">
							{subtitle}
						</Text>
					) : null}
				</View>
			</View>
			{action ? (
				<PressableScale
					onPress={action.onPress}
					accessibilityRole="button"
					accessibilityLabel={action.label}
					style={{ minHeight: 44, justifyContent: "center" }}
				>
					<Text className="text-primary font-medium">{action.label}</Text>
				</PressableScale>
			) : null}
		</View>
	);
}
