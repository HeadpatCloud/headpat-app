import type { ReactNode } from "react";
import { View } from "react-native";
import {
	ChevronRight,
	ExternalLink,
	type LucideIcon,
} from "@/components/icons";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";

type SettingsRowProps = {
	icon: LucideIcon;
	label: string;
	value?: string;
	badge?: ReactNode;
	index?: number;
	external?: boolean;
	onPress: () => void;
	accessibilityLabel?: string;
};

export function SettingsRow({
	icon,
	label,
	value,
	badge,
	index = 0,
	external,
	onPress,
	accessibilityLabel,
}: SettingsRowProps) {
	return (
		<AnimatedEntrance index={index}>
			<PressableScale
				onPress={onPress}
				haptic="selection"
				accessibilityRole="button"
				accessibilityLabel={accessibilityLabel ?? label}
			>
				<Card className="h-14 flex-row items-center gap-3 px-3">
					<View className="bg-primary/10 h-9 w-9 items-center justify-center rounded-2xl">
						<Icon as={icon} size={18} className="text-primary" />
					</View>
					<Text
						className="text-foreground flex-1 font-medium"
						numberOfLines={1}
					>
						{label}
					</Text>
					{value ? (
						<Text variant="muted" numberOfLines={1}>
							{value}
						</Text>
					) : null}
					{badge}
					<Icon
						as={external ? ExternalLink : ChevronRight}
						size={external ? 18 : 20}
						className="text-muted-foreground"
					/>
				</Card>
			</PressableScale>
		</AnimatedEntrance>
	);
}
