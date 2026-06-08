import type { ReactNode } from "react";
import { View } from "react-native";
import { Text, TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "destructive";

const container: Record<Variant, string> = {
	default: "bg-primary",
	secondary: "bg-secondary",
	outline: "border-border border",
	destructive: "bg-destructive",
};

const text: Record<Variant, string> = {
	default: "text-primary-foreground",
	secondary: "text-secondary-foreground",
	outline: "text-foreground",
	destructive: "text-white",
};

export function Badge({
	children,
	variant = "secondary",
	className,
}: {
	children: ReactNode;
	variant?: Variant;
	className?: string;
}) {
	return (
		<View
			className={cn(
				"self-start rounded-full px-2.5 py-0.5",
				container[variant],
				className,
			)}
		>
			<TextClassContext.Provider
				value={cn("text-xs font-medium", text[variant])}
			>
				{typeof children === "string" ? <Text>{children}</Text> : children}
			</TextClassContext.Provider>
		</View>
	);
}
