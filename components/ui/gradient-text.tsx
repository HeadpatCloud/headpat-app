import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type GradientTextProps = {
	children: string;
	className?: string;
	heading?: boolean;
};

// Display heading. The website sets headings in solid colour in the display
// face, so this does too (it used to be a masked gradient fill); the name stays
// so existing screens keep working.
export function GradientText({
	children,
	className,
	heading,
}: GradientTextProps) {
	return (
		<Text
			className={cn("font-display text-foreground", className)}
			role={heading ? "heading" : undefined}
		>
			{children}
		</Text>
	);
}
