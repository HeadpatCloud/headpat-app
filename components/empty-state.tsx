import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export function EmptyState({
	icon,
	title,
	subtitle,
}: {
	icon?: LucideIcon;
	title: string;
	subtitle?: string;
}) {
	return (
		<View className="items-center justify-center gap-2 px-8 py-16">
			{icon ? (
				<Icon as={icon} size={40} className="text-muted-foreground" />
			) : null}
			<Text variant="large" className="text-center">
				{title}
			</Text>
			{subtitle ? (
				<Text variant="muted" className="text-center">
					{subtitle}
				</Text>
			) : null}
		</View>
	);
}
