import { StyleSheet, View, type ViewProps } from "react-native";
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
				"bg-card border-border overflow-hidden rounded-3xl border",
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

// Formerly a glowing card with a gradient edge. The website's cards are flat, so
// this is now a plain card; the extra props are accepted for existing callers.
function GlowCard({ accent: _accent, glow: _glow, ...props }: GlowCardProps) {
	return <Card {...props} />;
}

const styles = StyleSheet.create({
	lightShadow: {
		boxShadow: "0 1 3 rgba(23, 51, 42, 0.08)",
	},
});

export { Card, GlowCard };
