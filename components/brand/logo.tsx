import { Image } from "react-native";
import { useTheme } from "@/lib/theme/provider";

// The mark is monochrome: the light (white) art belongs on the dark theme and
// the dark art on the light theme.
const ART = {
	light: require("../../assets/images/headpat_logo_light.png"),
	dark: require("../../assets/images/headpat_logo_dark.png"),
};

export function HeadpatLogo({
	size = 80,
	accessibilityLabel,
}: {
	size?: number;
	accessibilityLabel: string;
}) {
	const { scheme } = useTheme();
	return (
		<Image
			source={scheme === "dark" ? ART.light : ART.dark}
			style={{ width: size, height: size }}
			resizeMode="contain"
			accessibilityRole="image"
			accessibilityLabel={accessibilityLabel}
		/>
	);
}
