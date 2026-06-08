import { View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: ViewProps) {
	return (
		<View
			className={cn(
				"bg-card border-border overflow-hidden rounded-xl border",
				className,
			)}
			{...props}
		/>
	);
}

export { Card };
