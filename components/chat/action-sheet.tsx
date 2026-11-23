import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
	forwardRef,
	useCallback,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { Pressable, View } from "react-native";
import type { LucideIcon } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";

export type SheetAction = {
	key: string;
	icon: LucideIcon;
	label: string;
	destructive?: boolean;
	onPress: () => void;
};

export type ActionSheetHandle = {
	open: (title: string, actions: SheetAction[]) => void;
};

// A titled list of actions in a bottom sheet, for long-press menus. The sheet
// closes before the action runs, so an action can open another sheet or alert.
export const ActionSheet = forwardRef<ActionSheetHandle>(
	function ActionSheet(_props, ref) {
		const sheet = useRef<BottomSheetModal>(null);
		const [menu, setMenu] = useState<{
			title: string;
			actions: SheetAction[];
		}>({ title: "", actions: [] });

		useImperativeHandle(ref, () => ({
			open: (title, actions) => {
				setMenu({ title, actions });
				sheet.current?.present();
			},
		}));

		const run = useCallback((action: SheetAction) => {
			sheet.current?.dismiss();
			action.onPress();
		}, []);

		return (
			<Sheet ref={sheet} title={menu.title}>
				<View className="pb-2">
					{menu.actions.map((a) => (
						<Pressable
							key={a.key}
							onPress={() => run(a)}
							accessibilityRole="button"
							className="active:bg-muted flex-row items-center gap-3 rounded-2xl px-2 py-3.5"
						>
							<Icon
								as={a.icon}
								size={18}
								className={
									a.destructive ? "text-destructive" : "text-foreground"
								}
							/>
							<Text
								numberOfLines={1}
								className={`flex-1 font-semibold ${a.destructive ? "text-destructive" : ""}`}
							>
								{a.label}
							</Text>
						</Pressable>
					))}
				</View>
			</Sheet>
		);
	},
);
