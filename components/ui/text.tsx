import { Slot } from "@rn-primitives/slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import {
	Platform,
	Text as RNText,
	type Role,
	type TextStyle,
} from "react-native";
import { TYPE } from "@/lib/theme/foundations";
import { cn } from "@/lib/utils";

const textVariants = cva(
	cn(
		"text-foreground text-base",
		Platform.select({
			web: "select-text",
		}),
	),
	{
		variants: {
			variant: {
				default: "",
				display: cn(
					"text-foreground font-extrabold",
					Platform.select({ web: "scroll-m-20 text-balance" }),
				),
				h1: cn(
					"text-foreground font-extrabold",
					Platform.select({ web: "scroll-m-20 text-balance" }),
				),
				h2: cn(
					"text-foreground font-bold",
					Platform.select({ web: "scroll-m-20 first:mt-0" }),
				),
				h3: cn(
					"text-2xl font-semibold tracking-tight",
					Platform.select({ web: "scroll-m-20" }),
				),
				h4: cn(
					"text-xl font-semibold tracking-tight",
					Platform.select({ web: "scroll-m-20" }),
				),
				title: "text-xl font-bold tracking-tight",
				body: "text-base leading-7",
				p: "mt-3 leading-7 sm:mt-6",
				blockquote: "mt-4 border-l-2 pl-3 italic sm:mt-6 sm:pl-6",
				code: cn(
					"bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
				),
				lead: "text-muted-foreground text-xl",
				large: "text-lg font-semibold",
				small: "text-sm font-medium",
				caption: "text-muted-foreground text-xs uppercase tracking-wide",
				muted: "text-muted-foreground text-sm",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps["variant"]>;

// display/h1/h2 carry exact pt sizing + tracking from the canonical type
// scale; RN letterSpacing is pt, so these can't be expressed as Tailwind sizes.
const STYLE_VARIANTS: Partial<Record<TextVariant, TextStyle>> = {
	display: TYPE.display,
	h1: TYPE.h1,
	h2: TYPE.h2,
};

const ROLE: Partial<Record<TextVariant, Role>> = {
	display: "heading",
	h1: "heading",
	h2: "heading",
	h3: "heading",
	h4: "heading",
	blockquote: Platform.select({ web: "blockquote" as Role }),
	code: Platform.select({ web: "code" as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
	display: "1",
	h1: "1",
	h2: "2",
	h3: "3",
	h4: "4",
};

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
	className,
	asChild = false,
	variant = "default",
	style,
	...props
}: React.ComponentProps<typeof RNText> &
	React.RefAttributes<typeof RNText> &
	TextVariantProps & {
		asChild?: boolean;
	}) {
	const textClass = React.useContext(TextClassContext);
	const Component = asChild ? Slot : RNText;
	const variantStyle = variant ? STYLE_VARIANTS[variant] : undefined;
	return (
		<Component
			className={cn(textVariants({ variant }), textClass, className)}
			role={variant ? ROLE[variant] : undefined}
			aria-level={variant ? ARIA_LEVEL[variant] : undefined}
			style={variantStyle ? [variantStyle, style] : style}
			{...props}
		/>
	);
}

export { Text, TextClassContext };
