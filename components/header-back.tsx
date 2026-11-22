import { router } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet } from "react-native";
import { ChevronLeft } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

type Props = {
	onPress?: () => void;
	className?: string;
};

// The back button everywhere: a round card-coloured button, so it reads as
// something to tap rather than a loose arrow. Matches the header's circle icons.
export const HeaderBack = memo(function HeaderBack({
	onPress,
	className,
}: Props) {
	const { t } = useI18n();
	return (
		<Pressable
			onPress={onPress ?? (() => router.back())}
			accessibilityRole="button"
			accessibilityLabel={t("common.back")}
			hitSlop={8}
			className={cn(
				"bg-card border-border active:bg-muted mr-3 h-10 w-10 items-center justify-center rounded-full border",
				className,
			)}
			style={styles.shadow}
		>
			<Icon
				as={ChevronLeft}
				size={22}
				className="text-foreground"
				style={styles.nudge}
			/>
		</Pressable>
	);
});

const styles = StyleSheet.create({
	shadow: { boxShadow: "0 1 3 rgba(23, 51, 42, 0.08)" },
	// The chevron's visual weight sits right of centre; pull it back a touch.
	nudge: { marginLeft: -2 },
});
