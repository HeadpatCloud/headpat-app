import { format } from "date-fns/format";
import { StyleSheet, View, type ViewProps } from "react-native";
import { Gradient } from "@/components/ui/gradient";
import { Text } from "@/components/ui/text";
import { withAlpha } from "@/lib/theme/color";
import { useTheme } from "@/lib/theme/provider";
import { cn } from "@/lib/utils";

type DateBlockProps = ViewProps & {
	date: Date;
	size?: "sm" | "lg";
	// lg only: translucent panel meant to sit over the hero image.
	overlay?: boolean;
};

// The event date "stamp": compact month/day for list rows, big display
// numerals for the detail hero. Pure typography over a gradient wash.
export function DateBlock({
	date,
	size = "sm",
	overlay = false,
	className,
	...props
}: DateBlockProps) {
	const { colors } = useTheme();
	if (size === "sm") {
		return (
			<View
				className={cn(
					"w-14 items-center justify-center overflow-hidden rounded-xl py-2",
					className,
				)}
				{...props}
			>
				<Gradient
					opacity={0.12}
					style={StyleSheet.absoluteFill}
					pointerEvents="none"
				/>
				<Text variant="caption" className="text-primary">
					{format(date, "MMM")}
				</Text>
				<Text
					className="text-foreground text-xl font-extrabold"
					style={{ letterSpacing: -0.4 }}
				>
					{format(date, "d")}
				</Text>
			</View>
		);
	}

	return (
		<View
			className={cn(
				"overflow-hidden rounded-2xl p-4",
				!overlay && "bg-card border-border border",
				className,
			)}
			{...props}
		>
			{overlay ? (
				// Translucent card base keeps the type readable over photos.
				<View
					style={[
						StyleSheet.absoluteFill,
						{ backgroundColor: withAlpha(colors.card, 0.7) },
					]}
					pointerEvents="none"
				/>
			) : null}
			<Gradient
				opacity={overlay ? 0.4 : 0.16}
				style={StyleSheet.absoluteFill}
				pointerEvents="none"
			/>
			<View className="flex-row items-center gap-4">
				<Text
					className="text-foreground"
					style={{
						fontSize: 48,
						fontWeight: "800",
						lineHeight: 52,
						letterSpacing: -1,
					}}
				>
					{format(date, "d")}
				</Text>
				<View className="gap-0.5">
					<Text variant="caption" className="text-primary">
						{format(date, "EEEE")}
					</Text>
					<Text className="text-foreground font-semibold">
						{format(date, "MMMM")} · {format(date, "p")}
					</Text>
				</View>
			</View>
		</View>
	);
}
