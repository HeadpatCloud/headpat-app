import MaskedView from "@react-native-masked-view/masked-view";
import { useEffect, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { Gradient } from "@/components/ui/gradient";
import { Text } from "@/components/ui/text";
import { hexToTriplet, tripletToHex } from "@/lib/theme/color";
import { useTheme } from "@/lib/theme/provider";

type GradientTextProps = {
	children: string;
	className?: string;
	heading?: boolean;
};

// Push a stop toward the readable end for the active scheme so the masked fill
// always contrasts with the background (a dark-green stop on a near-black bg is
// unreadable otherwise).
function readableStop(hex: string, scheme: "light" | "dark"): string {
	const m = /^(\d+) (\d+)% (\d+)%$/.exec(hexToTriplet(hex));
	if (!m) return hex;
	const l = Number(m[3]);
	const next = scheme === "dark" ? Math.max(l, 64) : Math.min(l, 40);
	return tripletToHex(`${m[1]} ${m[2]}% ${next}%`);
}

// Big display heading filled with the theme gradient. The real <Text> is both
// the mask and the screen-reader label; a solid copy is the fallback.
export function GradientText({
	children,
	className,
	heading,
}: GradientTextProps) {
	const { gradient, scheme } = useTheme();
	const [reduceTransparency, setReduceTransparency] = useState(false);
	useEffect(() => {
		AccessibilityInfo.isReduceTransparencyEnabled?.().then(
			setReduceTransparency,
		);
		const sub = AccessibilityInfo.addEventListener(
			"reduceTransparencyChanged",
			setReduceTransparency,
		);
		return () => sub.remove();
	}, []);

	if (reduceTransparency) {
		return (
			<Text
				className={className}
				accessibilityRole={heading ? "header" : undefined}
			>
				{children}
			</Text>
		);
	}

	const colors: [string, string] = [
		readableStop(gradient.colors[0], scheme),
		readableStop(gradient.colors[1], scheme),
	];

	return (
		<MaskedView
			accessibilityRole={heading ? "header" : undefined}
			maskElement={
				<View style={{ backgroundColor: "transparent" }}>
					<Text className={className}>{children}</Text>
				</View>
			}
		>
			<Gradient colors={colors}>
				<Text
					className={className}
					style={{ opacity: 0 }}
					accessibilityElementsHidden={heading}
				>
					{children}
				</Text>
			</Gradient>
		</MaskedView>
	);
}
