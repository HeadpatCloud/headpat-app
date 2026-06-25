declare module '*.css';

declare module "lucide-react-native/dist/esm/icons/*" {
	import type { LucideIcon } from "lucide-react-native";
	const icon: LucideIcon;
	export default icon;
}
