import { memo } from "react";
import { View } from "react-native";
import type { LucideIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

type PageTitleProps = {
	title: string;
	subtitle?: string;
	action?: { label: string; icon?: LucideIcon; onPress: () => void };
};

// Big display-face page heading with an optional pill action on the right, like
// "Gallery  [+ Upload]" on the website.
export const PageTitle = memo(function PageTitle({
	title,
	subtitle,
	action,
}: PageTitleProps) {
	return (
		<View className="flex-row items-center justify-between gap-3 pb-3 pt-2">
			<View className="flex-1">
				<Text
					role="heading"
					className="font-display text-foreground text-[32px] font-semibold leading-10"
				>
					{title}
				</Text>
				{subtitle ? (
					<Text className="text-muted-foreground font-semibold">
						{subtitle}
					</Text>
				) : null}
			</View>
			{action ? (
				<Button
					size="sm"
					onPress={action.onPress}
					accessibilityLabel={action.label}
				>
					{action.icon ? (
						<Icon
							as={action.icon}
							size={18}
							className="text-primary-foreground"
						/>
					) : null}
					<Text>{action.label}</Text>
				</Button>
			) : null}
		</View>
	);
});
