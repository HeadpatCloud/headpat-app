import { cva, type VariantProps } from "class-variance-authority";
import * as Haptics from "expo-haptics";
import type React from "react";
import {
	ActivityIndicator,
	type GestureResponderEvent,
	Platform,
	Pressable,
	type PressableProps,
	StyleSheet,
	View,
} from "react-native";
import { Gradient } from "@/components/ui/gradient";
import { TextClassContext } from "@/components/ui/text";
import { useTheme } from "@/lib/theme/provider";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	cn(
		"group relative shrink-0 flex-row items-center justify-center gap-2 overflow-hidden shadow-none active:scale-[0.98]",
		Platform.select({
			web: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		}),
	),
	{
		variants: {
			variant: {
				default: "active:opacity-95",
				destructive: cn(
					"bg-destructive active:bg-destructive/90 dark:bg-destructive/60 shadow-sm shadow-black/5",
					Platform.select({
						web: "hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
					}),
				),
				outline: cn(
					"border-border bg-background active:bg-accent dark:bg-input/30 dark:border-input dark:active:bg-input/50 border shadow-sm shadow-black/5",
					Platform.select({
						web: "hover:bg-accent dark:hover:bg-input/50",
					}),
				),
				secondary: cn(
					"bg-secondary active:bg-secondary/80 shadow-sm shadow-black/5",
					Platform.select({ web: "hover:bg-secondary/80" }),
				),
				ghost: cn(
					"active:bg-accent dark:active:bg-accent/50",
					Platform.select({ web: "hover:bg-accent dark:hover:bg-accent/50" }),
				),
				link: "",
			},
			size: {
				default: cn(
					"h-12 rounded-2xl px-5 py-2",
					Platform.select({ web: "has-[>svg]:px-3" }),
				),
				sm: cn(
					"h-11 gap-1.5 rounded-xl px-4",
					Platform.select({ web: "has-[>svg]:px-2.5" }),
				),
				lg: cn(
					"h-14 rounded-2xl px-7",
					Platform.select({ web: "has-[>svg]:px-4" }),
				),
				icon: "h-12 w-12 rounded-full",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

const buttonTextVariants = cva(
	cn(
		"text-foreground text-sm font-medium",
		Platform.select({ web: "pointer-events-none transition-colors" }),
	),
	{
		variants: {
			variant: {
				default: "text-primary-foreground",
				destructive: "text-white",
				outline: cn(
					"group-active:text-accent-foreground",
					Platform.select({ web: "group-hover:text-accent-foreground" }),
				),
				secondary: "text-secondary-foreground",
				ghost: "group-active:text-accent-foreground",
				link: cn(
					"text-primary group-active:underline",
					Platform.select({
						web: "underline-offset-4 hover:underline group-hover:underline",
					}),
				),
			},
			size: {
				default: "",
				sm: "",
				lg: "",
				icon: "",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

const RADIUS_BY_SIZE: Record<ButtonSize, number> = {
	default: 16,
	sm: 12,
	lg: 16,
	icon: 999,
};

const SPINNER_TOKEN: Record<
	ButtonVariant,
	"primary-foreground" | "secondary-foreground" | "accent-foreground" | "primary"
> = {
	default: "primary-foreground",
	destructive: "primary-foreground",
	secondary: "secondary-foreground",
	outline: "accent-foreground",
	ghost: "accent-foreground",
	link: "primary",
};

type ButtonProps = Omit<PressableProps, "children"> &
	VariantProps<typeof buttonVariants> & {
		loading?: boolean;
		fullWidth?: boolean;
		children?: React.ReactNode;
	};

function Button({
	className,
	variant = "default",
	size = "default",
	loading = false,
	fullWidth = false,
	disabled,
	onPressIn,
	children,
	...props
}: ButtonProps) {
	const { colors } = useTheme();
	const resolvedVariant = variant ?? "default";
	const resolvedSize = size ?? "default";
	const isDisabled = disabled || loading;
	const isGradient = resolvedVariant === "default";
	const radius = RADIUS_BY_SIZE[resolvedSize];

	const handlePressIn = (e: GestureResponderEvent) => {
		if (Platform.OS !== "web")
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onPressIn?.(e);
	};

	const content = (
		<>
			{loading ? (
				<View
					style={StyleSheet.absoluteFill}
					className="items-center justify-center"
				>
					<ActivityIndicator color={colors[SPINNER_TOKEN[resolvedVariant]]} />
				</View>
			) : null}
			{loading ? (
				<View
					style={{ opacity: 0 }}
					className="flex-row items-center justify-center gap-2"
				>
					{children}
				</View>
			) : (
				children
			)}
		</>
	);

	// Gradient (default) variant: the fill lives in an outer box BEHIND a
	// transparent Pressable, so it covers the whole button while the Pressable
	// keeps a full-size touch target and lays its children out as a row.
	if (isGradient) {
		return (
			<TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
				<View
					className={cn(
						isDisabled && "opacity-50",
						fullWidth && "self-stretch",
						"overflow-hidden",
						className,
					)}
					style={{ borderRadius: radius }}
				>
					<Gradient
						glow={!isDisabled}
						borderRadius={radius}
						style={StyleSheet.absoluteFill}
						pointerEvents="none"
						accessibilityElementsHidden
						importantForAccessibility="no-hide-descendants"
					/>
					<Pressable
						className={buttonVariants({ variant, size })}
						role="button"
						disabled={isDisabled}
						accessibilityState={{ disabled: !!isDisabled, busy: loading }}
						onPressIn={handlePressIn}
						android_ripple={{ color: "rgba(255,255,255,0.2)" }}
						{...props}
					>
						{content}
					</Pressable>
				</View>
			</TextClassContext.Provider>
		);
	}

	return (
		<TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
			<Pressable
				className={cn(
					isDisabled && "opacity-50",
					fullWidth && "self-stretch",
					buttonVariants({ variant, size }),
					className,
				)}
				role="button"
				disabled={isDisabled}
				accessibilityState={{ disabled: !!isDisabled, busy: loading }}
				onPressIn={handlePressIn}
				{...props}
			>
				{content}
			</Pressable>
		</TextClassContext.Provider>
	);
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
