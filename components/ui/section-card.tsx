import { memo, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type SectionCardProps = {
	title?: string;
	link?: { label: string; onPress: () => void };
	className?: string;
	children: ReactNode;
};

// The website's home "section": a big rounded card with a display-face title
// and a bold link on the right.
export const SectionCard = memo(function SectionCard({
	title,
	link,
	className,
	children,
}: SectionCardProps) {
	return (
		<Card className={cn("gap-4 p-5", className)}>
			{title || link ? (
				<View className="flex-row items-center justify-between gap-3">
					{title ? (
						<Text
							role="heading"
							className="font-display flex-1 text-xl font-semibold"
						>
							{title}
						</Text>
					) : (
						<View />
					)}
					{link ? (
						<Pressable
							onPress={link.onPress}
							hitSlop={10}
							accessibilityRole="link"
							accessibilityLabel={link.label}
						>
							<Text className="text-link text-sm font-extrabold">
								{link.label}
							</Text>
						</Pressable>
					) : null}
				</View>
			) : null}
			{children}
		</Card>
	);
});
