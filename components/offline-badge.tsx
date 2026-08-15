import { useEffect, useRef, useState } from "react";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useOnline } from "@/lib/db/use-online";
import { useI18n } from "@/lib/i18n/provider";
import { useReducedMotion } from "@/lib/motion/reduced-motion";

// Keys offline.lines.1 … offline.lines.N in every locale. Keep in sync.
const LINE_COUNT = 6;

function roll(exclude: number): number {
	if (LINE_COUNT <= 1) return 1;
	let pick = exclude;
	while (pick === exclude) pick = 1 + Math.floor(Math.random() * LINE_COUNT);
	return pick;
}

/**
 * Sticky offline notice, mounted once above the navigator so it shows on every
 * route. Reads connectivity from React Query's onlineManager, which lib/query.ts
 * already drives from NetInfo.
 */
export function OfflineBadge() {
	const { t } = useI18n();
	const insets = useSafeAreaInsets();
	const reduced = useReducedMotion();
	const online = useOnline();
	// Re-rolled on each drop, so reconnecting and dropping again shows a
	// different line, as does a fresh app start.
	const previous = useRef(roll(0));
	const [line, setLine] = useState(previous.current);

	useEffect(() => {
		if (online) return;
		const pick = roll(previous.current);
		previous.current = pick;
		setLine(pick);
	}, [online]);

	if (online) return null;

	return (
		<Animated.View
			entering={reduced ? undefined : FadeInUp.duration(220)}
			exiting={reduced ? undefined : FadeOutUp.duration(160)}
			pointerEvents="none"
			style={{
				position: "absolute",
				top: insets.top,
				left: 0,
				right: 0,
				alignItems: "center",
				paddingHorizontal: 12,
				paddingVertical: 6,
			}}
			accessibilityRole="alert"
			accessibilityLiveRegion="polite"
		>
			<Text
				variant="small"
				numberOfLines={1}
				className="bg-muted text-muted-foreground border-border overflow-hidden rounded-full border px-3 py-1"
			>
				{t(`offline.lines.${line}`)}
			</Text>
		</Animated.View>
	);
}
