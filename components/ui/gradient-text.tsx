import MaskedView from "@react-native-masked-view/masked-view";
import { useEffect, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { Gradient } from "@/components/ui/gradient";
import { Text } from "@/components/ui/text";

type GradientTextProps = {
	children: string;
	className?: string;
};

// Big display heading filled with the theme gradient. The real <Text> is both
// the mask and the screen-reader label; a solid copy is the fallback.
export function GradientText({ children, className }: GradientTextProps) {
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
		return <Text className={className}>{children}</Text>;
	}

	return (
		<MaskedView
			maskElement={
				<View style={{ backgroundColor: "transparent" }}>
					<Text className={className}>{children}</Text>
				</View>
			}
		>
			<Gradient>
				<Text className={className} style={{ opacity: 0 }}>
					{children}
				</Text>
			</Gradient>
		</MaskedView>
	);
}
