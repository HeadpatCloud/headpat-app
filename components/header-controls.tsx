import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRef } from "react";
import { Pressable, View } from "react-native";
import { Check, Globe, Moon, Sun } from "@/components/icons";
import { NotificationsBell } from "@/components/notifications-bell";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { LOCALES, type Locale, useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";
import { useThemeToggle } from "@/lib/theme/theme-reveal";

export function HeaderControls() {
	const { scheme } = useTheme();
	const toggleTheme = useThemeToggle();
	const { locale, setLocale, t } = useI18n();
	const sheetRef = useRef<BottomSheetModal>(null);

	const pick = (next: Locale) => {
		setLocale(next);
		sheetRef.current?.dismiss();
	};

	return (
		<>
			<View className="flex-row items-center">
				<NotificationsBell />
				<Pressable
					onPress={() => sheetRef.current?.present()}
					hitSlop={8}
					accessibilityRole="button"
					accessibilityLabel={t("header.language")}
					className="active:bg-muted h-10 w-10 items-center justify-center rounded-full"
				>
					<Icon as={Globe} size={20} className="text-foreground" />
				</Pressable>
				<Pressable
					// The new theme grows out of the tap point, like on the website.
					onPress={(e) =>
						toggleTheme({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })
					}
					hitSlop={8}
					accessibilityRole="button"
					accessibilityLabel={t("header.toggleMode")}
					className="active:bg-muted h-10 w-10 items-center justify-center rounded-full"
				>
					<Icon
						as={scheme === "dark" ? Sun : Moon}
						size={20}
						className="text-foreground"
					/>
				</Pressable>
			</View>

			<Sheet ref={sheetRef} title={t("header.language")} accent>
				<View className="gap-1">
					{LOCALES.map((l) => (
						<Pressable
							key={l.code}
							onPress={() => pick(l.code)}
							accessibilityRole="button"
							accessibilityState={{ selected: locale === l.code }}
							accessibilityLabel={l.label}
							className="active:bg-accent/50 flex-row items-center gap-3 rounded-xl px-2 py-3.5"
						>
							<Text
								className={
									locale === l.code
										? "text-primary flex-1 font-semibold"
										: "text-foreground flex-1"
								}
							>
								{l.label}
							</Text>
							{locale === l.code ? (
								<Icon as={Check} size={18} className="text-primary" />
							) : null}
						</Pressable>
					))}
				</View>
			</Sheet>
		</>
	);
}

const renderHeaderControls = () => <HeaderControls />;

// Screen options for detail stacks: the quick controls on the right of the
// native header. A constant, so the shared stack options stay memoised.
export const DETAIL_STACK_OPTIONS = {
	headerRight: renderHeaderControls,
} as const;
