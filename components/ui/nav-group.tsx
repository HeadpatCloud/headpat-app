import { memo, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { ChevronRight, type LucideIcon } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

type NavRowProps = {
	icon: LucideIcon;
	label: string;
	badge?: ReactNode;
	tone?: "default" | "destructive";
	onPress: () => void;
	accessibilityLabel?: string;
};

// A row of the website's sidebar: icon, bold label, soft press highlight.
export const NavRow = memo(function NavRow({
	icon,
	label,
	badge,
	tone = "default",
	onPress,
	accessibilityLabel,
}: NavRowProps) {
	const danger = tone === "destructive";
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? label}
			className="active:bg-muted min-h-12 flex-row items-center gap-3 rounded-2xl px-3"
		>
			<Icon
				as={icon}
				size={20}
				className={danger ? "text-destructive" : "text-link"}
			/>
			<Text
				numberOfLines={1}
				className={`flex-1 font-bold ${danger ? "text-destructive" : "text-foreground"}`}
			>
				{label}
			</Text>
			{badge}
			{danger ? null : (
				<Icon as={ChevronRight} size={18} className="text-muted-foreground" />
			)}
		</Pressable>
	);
});

// A titled group of sidebar rows in one rounded card.
export const NavGroup = memo(function NavGroup({
	title,
	children,
}: {
	title?: string;
	children: ReactNode;
}) {
	return (
		<Card className="gap-0.5 p-2">
			{title ? (
				<View className="px-3 pb-1 pt-2">
					<Text className="text-muted-foreground text-xs font-extrabold uppercase tracking-wider">
						{title}
					</Text>
				</View>
			) : null}
			{children}
		</Card>
	);
});
