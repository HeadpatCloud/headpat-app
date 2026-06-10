import { StyleSheet, View, type ViewProps } from "react-native";
import { Gradient, GlowShadow } from "@/components/ui/gradient";
import { useTheme } from "@/lib/theme/provider";
import { cn } from "@/lib/utils";

// The className stays constant across light/dark; the mode-specific elevation
// goes through `style`. Toggling the className by scheme makes NativeWind think
// the component needs a mid-life "upgrade" and it remounts/warns (which crashes
// while serializing props that reference the navigation context).
function Card({ className, style, ...props }: ViewProps) {
	const { scheme } = useTheme();
	return (
		<View
			className={cn(
				"bg-card border-border overflow-hidden rounded-2xl border",
				className,
			)}
			style={[scheme === "light" ? styles.lightShadow : undefined, style]}
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
	lightShadow: {
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	edge: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: 3,
	},
});

export { Card, GlowCard };
