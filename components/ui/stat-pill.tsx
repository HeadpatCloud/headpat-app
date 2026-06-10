import type { LucideIcon } from "@/components/icons";
import { View } from "react-native";
import { Gradient, GlowShadow } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { RADIUS } from "@/lib/theme/foundations";
import { useTheme } from "@/lib/theme/provider";
import { cn } from "@/lib/utils";

type Emphasis = "tonal" | "gradient" | "plain";

type StatPillProps = {
	label: string;
	value: string | number;
	icon?: LucideIcon;
	onPress?: () => void;
	emphasis?: Emphasis;
};

export function StatPill({
	label,
	value,
	icon,
	onPress,
	emphasis = "tonal",
}: StatPillProps) {
	const { colors, glow } = useTheme();
	const gradient = emphasis === "gradient";
	const fg = gradient ? colors["primary-foreground"] : undefined;

	const inner = (
		<View className="flex-row items-center gap-2">
			{icon ? (
				<Icon
					as={icon}
					size={18}
					className={gradient ? undefined : "text-primary"}
					color={fg}
				/>
			) : null}
			<View>
				<Text
					variant="title"
					className={gradient ? undefined : "text-foreground"}
					style={gradient ? { color: fg } : undefined}
				>
					{value}
				</Text>
				<Text
					variant="caption"
					className={gradient ? undefined : "text-muted-foreground"}
					style={gradient ? { color: fg } : undefined}
				>
					{label}
				</Text>
			</View>
		</View>
	);

	const body =
		emphasis === "gradient" ? (
			<Gradient
				glow
				borderRadius={RADIUS.lg}
				className="min-h-[44px] justify-center px-4 py-2.5"
			>
				{inner}
			</Gradient>
		) : (
			<View
				className={cn(
					"min-h-[44px] justify-center rounded-2xl px-4 py-2.5",
					emphasis === "tonal" && "bg-primary/10",
				)}
			>
				{inner}
			</View>
		);

	if (!onPress) return body;

	return (
		<PressableScale
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={`${value} ${label}`}
			style={emphasis === "gradient" ? GlowShadow(glow) : undefined}
		>
			{body}
		</PressableScale>
	);
}
