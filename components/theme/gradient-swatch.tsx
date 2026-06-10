import { type ComponentProps, useMemo } from "react";
import { Gradient } from "@/components/ui/gradient";
import { gradientStops, hexToTriplet } from "@/lib/theme/color";

type GradientSwatchProps = Omit<ComponentProps<typeof Gradient>, "colors"> & {
	primary: string;
	accent: string;
	scheme: "light" | "dark";
};

// The signature primary -> accent gradient for an arbitrary theme (preset,
// custom row, builder draft) rather than the active one. Takes "#rrggbb".
export function GradientSwatch({
	primary,
	accent,
	scheme,
	...rest
}: GradientSwatchProps) {
	const colors = useMemo(
		() => gradientStops(hexToTriplet(primary), hexToTriplet(accent), scheme),
		[primary, accent, scheme],
	);
	return <Gradient colors={colors} {...rest} />;
}
