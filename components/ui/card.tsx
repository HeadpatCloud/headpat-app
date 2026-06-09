import { StyleSheet, View, type ViewProps } from "react-native";
import { Gradient, GlowShadow } from "@/components/ui/gradient";
import { useTheme } from "@/lib/theme/provider";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: ViewProps) {
	const { scheme } = useTheme();
	return (
		<View
			className={cn(
				"bg-card overflow-hidden rounded-2xl",
				scheme === "dark"
					? "border-border border bg-card/95"
					: "border-border/60 border shadow-sm shadow-black/10",
				className,
			)}
			{...props}
		/>
	);
}

type GlowCardProps = ViewProps & {
	accent?: "edge" | "wash" | "none";
	glow?: boolean;
};

function GlowCard({
	accent = "edge",
	glow = true,
	className,
	style,
	children,
	...props
}: GlowCardProps) {
	const { glow: glowColor } = useTheme();
	return (
		<View style={glow ? GlowShadow(glowColor) : undefined}>
			<Card
				className={cn(accent === "wash" && "bg-transparent", className)}
				style={style}
				{...props}
			>
				{accent === "wash" ? (
					<Gradient
						opacity={0.08}
						style={StyleSheet.absoluteFill}
						pointerEvents="none"
					/>
				) : null}
				{accent === "edge" ? (
					<Gradient
						style={styles.edge}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 0 }}
						pointerEvents="none"
					/>
				) : null}
				{children}
			</Card>
		</View>
	);
}

const styles = StyleSheet.create({
	edge: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: 3,
	},
});

export { Card, GlowCard };
