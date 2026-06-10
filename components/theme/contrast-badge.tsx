import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import {
	contrastRatio,
	hexToTriplet,
	readableForeground,
	tripletToHex,
} from "@/lib/theme/color";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

type Verdict = "pass" | "aa" | "fail";

const BOX: Record<Verdict, string> = {
	pass: "bg-primary/15",
	aa: "bg-muted",
	fail: "bg-destructive/15",
};
const TEXT: Record<Verdict, string> = {
	pass: "text-primary",
	aa: "text-muted-foreground",
	fail: "text-destructive",
};
const LABEL_KEY: Record<Verdict, string> = {
	pass: "themeBuilder.contrastPass",
	aa: "themeBuilder.contrastAa",
	fail: "themeBuilder.contrastFail",
};

// WCAG verdict pill for a fg/bg hex pair. `threshold` is the pair's minimum
// (4.5 text, 3 fills/large); >= 7 always reads PASS. `solid` swaps the
// active-theme classes for a scrim + bg-derived text so the badge stays
// legible on arbitrary draft colors (builder preview chips).
export function ContrastBadge({
	fg,
	bg,
	threshold,
	solid = false,
}: {
	fg: string;
	bg: string;
	threshold: number;
	solid?: boolean;
}) {
	const { t } = useI18n();
	if (!HEX_RE.test(fg) || !HEX_RE.test(bg)) return null;
	const ratio = contrastRatio(hexToTriplet(fg), hexToTriplet(bg));
	const verdict: Verdict =
		ratio >= 7 ? "pass" : ratio >= threshold ? "aa" : "fail";
	const label = t(LABEL_KEY[verdict]);
	const solidFg = solid
		? tripletToHex(readableForeground(hexToTriplet(bg)))
		: null;
	return (
		<View
			className={
				solidFg
					? "self-start rounded-full px-2 py-0.5"
					: `self-start rounded-full px-2 py-0.5 ${BOX[verdict]}`
			}
			style={
				solidFg
					? {
							backgroundColor:
								solidFg === "#ffffff"
									? "rgba(0, 0, 0, 0.55)"
									: "rgba(255, 255, 255, 0.7)",
						}
					: null
			}
			accessibilityLabel={t("themeBuilder.contrastBadgeA11y", {
				ratio: ratio.toFixed(1),
				verdict: label,
			})}
		>
			<Text
				className={
					solidFg
						? "text-xs font-semibold"
						: `text-xs font-semibold ${TEXT[verdict]}`
				}
				style={solidFg ? { color: solidFg } : null}
			>{`${label} ${ratio.toFixed(1)}`}</Text>
		</View>
	);
}
