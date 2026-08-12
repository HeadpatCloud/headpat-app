import type { LucideIcon, LucideProps } from "lucide-react-native";
import { type ComponentRef, forwardRef } from "react";
import Svg, { Path } from "react-native-svg";

// lucide v1 dropped its brand glyphs; these keep the v0.545 paths (ISC) so the
// GitHub/Twitch auth providers stay recognisable.
function brandIcon(displayName: string, paths: string[]): LucideIcon {
	const Component = forwardRef<ComponentRef<typeof Svg>, LucideProps>(
		({ color = "currentColor", size = 24, strokeWidth = 2, ...rest }, ref) => (
			<Svg
				fill="none"
				height={size}
				ref={ref}
				stroke={color}
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={strokeWidth}
				viewBox="0 0 24 24"
				width={size}
				{...rest}
			>
				{paths.map((d) => (
					<Path
						d={d}
						fill="none"
						key={d}
						stroke={color}
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={strokeWidth}
					/>
				))}
			</Svg>
		),
	);
	Component.displayName = displayName;
	return Component;
}

export const Github = brandIcon("Github", [
	"M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4",
	"M9 18c-4.51 2-5-2-7-2",
]);

export const Twitch = brandIcon("Twitch", [
	"M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7",
]);
