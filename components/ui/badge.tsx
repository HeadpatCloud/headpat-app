import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { LucideIcon } from "@/components/icons";
import { Gradient } from "@/components/ui/gradient";
import { Icon } from "@/components/ui/icon";
import { Text, TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type Variant =
	| "default"
	| "secondary"
	| "outline"
	| "destructive"
	| "gradient"
	| "tonal";

const container: Record<Variant, string> = {
	default: "bg-primary",
	secondary: "bg-secondary",
	outline: "border-border border",
	destructive: "bg-destructive",
	gradient: "",
	tonal: "bg-primary/15",
};

const text: Record<Variant, string> = {
	default: "text-primary-foreground",
	secondary: "text-secondary-foreground",
	outline: "text-foreground",
	destructive: "text-white",
	gradient: "text-primary-foreground",
	tonal: "text-primary",
};

export function Badge({
	children,
	variant = "secondary",
	icon,
	className,
}: {
	children: ReactNode;
	variant?: Variant;
	icon?: LucideIcon;
	className?: string;
}) {
	const inner = (
		<TextClassContext.Provider value={cn("text-xs font-medium", text[variant])}>
			{icon ? <Icon as={icon} size={12} /> : null}
			{typeof children === "string" ? <Text>{children}</Text> : children}
		</TextClassContext.Provider>
	);

	const layout =
		"flex-row items-center gap-1 self-start rounded-full px-2.5 py-0.5";

	if (variant === "gradient") {
		// layout classes live on a View — LinearGradient ignores className, so
		// the gradient paints behind as an absolute fill instead.
		return (
			<View className={cn(layout, "overflow-hidden", className)}>
				<Gradient style={StyleSheet.absoluteFill} pointerEvents="none" />
				{inner}
			</View>
		);
	}

	return (
		<View className={cn(layout, container[variant], className)}>{inner}</View>
	);
}
