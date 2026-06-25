import type { LucideIcon, LucideProps } from "lucide-react-native";
import { cssInterop } from "nativewind";
import * as React from "react";
import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type IconProps = LucideProps & {
	as: LucideIcon;
} & React.RefAttributes<LucideIcon>;

function IconImpl({ as: IconComponent, ...props }: IconProps) {
	return <IconComponent {...props} />;
}

cssInterop(IconImpl, {
	className: {
		target: "style",
		nativeStyleToProp: {
			height: "size",
			width: "size",
		},
	},
});

/**
 * A wrapper component for Lucide icons with Nativewind `className` support via `cssInterop`.
 *
 * This component allows you to render any Lucide icon while applying utility classes
 * using `nativewind`. It avoids the need to wrap or configure each icon individually.
 *
 * @component
 * @example
 * ```tsx
 * import { ArrowRight } from 'lucide-react-native';
 * import { Icon } from '@/registry/components/ui/icon';
 *
 * <Icon as={ArrowRight} className="text-red-500" size={16} />
 * ```
 *
 * For a gradient-colored glyph (rare — e.g. hero stat icons), the caller wraps
 * `<Icon>` in a `<MaskedView>` over `<Gradient />`; `Icon` itself stays a thin
 * theme-class primitive and gets no color/gradient prop.
 *
 * @param {LucideIcon} as - The Lucide icon component to render.
 * @param {string} className - Utility classes to style the icon using Nativewind.
 * @param {number} size - Icon size (defaults to 16, Comfortable density).
 * @param {...LucideProps} ...props - Additional Lucide icon props passed to the "as" icon.
 */
function Icon({
	as: IconComponent,
	className,
	size = 16,
	...props
}: IconProps) {
	const textClass = React.useContext(TextClassContext);
	return (
		<IconImpl
			as={IconComponent}
			className={cn("text-foreground", textClass, className)}
			size={size}
			{...props}
		/>
	);
}

export { Icon };
