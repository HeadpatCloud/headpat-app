import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PageTitle } from "@/components/ui/page-title";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { PressableScale } from "@/lib/motion/pressable-scale";
import {
	DEFAULT_WIDGET_SETTINGS,
	type HomeSection,
	type HomeSectionId,
} from "@/widgets/settings";
import { useWidgetSettings } from "@/widgets/use-widgets";

function RowButton({
	icon,
	label,
	disabled,
	onPress,
}: {
	icon: typeof ArrowUp;
	label: string;
	disabled?: boolean;
	onPress: () => void;
}) {
	return (
		<PressableScale
			onPress={onPress}
			disabled={disabled}
			haptic="selection"
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled: !!disabled }}
			className="h-11 w-11 items-center justify-center rounded-full"
			style={{ opacity: disabled ? 0.3 : 1 }}
		>
			<Icon as={icon} size={20} className="text-link" />
		</PressableScale>
	);
}

// Reorder and hide the Home tab's sections. Saved like the widget settings:
// to the account when signed in, otherwise on this phone.
export default function HomeLayoutScreen() {
	const insets = useSafeAreaInsets();
	const { t } = useI18n();
	const { data: session } = useSession();
	const { settings, update } = useWidgetSettings();
	const sections = settings.home.sections;

	const save = (next: HomeSection[]) =>
		update((s) => ({ ...s, home: { sections: next } }));

	const move = (index: number, by: -1 | 1) => {
		const next = [...sections];
		const [item] = next.splice(index, 1);
		next.splice(index + by, 0, item);
		save(next);
	};

	const toggle = (id: HomeSectionId) =>
		save(sections.map((s) => (s.id === id ? { ...s, hidden: !s.hidden } : s)));

	const isDefault =
		JSON.stringify(sections) ===
		JSON.stringify(DEFAULT_WIDGET_SETTINGS.home.sections);

	return (
		<View className="bg-background flex-1">
			<ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
				<AnimatedEntrance index={0} className="px-4">
					<PageTitle
						title={t("widgets.home.title")}
						subtitle={t("widgets.home.subtitle")}
					/>
				</AnimatedEntrance>

				<View className="gap-3 px-4 pb-4 pt-2">
					{sections.map((section, i) => {
						const name = t(`widgets.home.sections.${section.id}`);
						return (
							<Card
								key={section.id}
								className="flex-row items-center gap-1 py-2 pl-5 pr-2"
							>
								<View
									className="flex-1"
									style={{ opacity: section.hidden ? 0.55 : 1 }}
								>
									<Text className="font-extrabold">{name}</Text>
									{section.hidden ? (
										<Text className="text-muted-foreground text-sm font-semibold">
											{t("widgets.home.hidden")}
										</Text>
									) : null}
								</View>
								<RowButton
									icon={ArrowUp}
									label={t("widgets.home.moveUp", { name })}
									disabled={i === 0}
									onPress={() => move(i, -1)}
								/>
								<RowButton
									icon={ArrowDown}
									label={t("widgets.home.moveDown", { name })}
									disabled={i === sections.length - 1}
									onPress={() => move(i, 1)}
								/>
								<RowButton
									icon={section.hidden ? EyeOff : Eye}
									label={
										section.hidden
											? t("widgets.home.show", { name })
											: t("widgets.home.hide", { name })
									}
									onPress={() => toggle(section.id)}
								/>
							</Card>
						);
					})}

					<Button
						variant="outline"
						disabled={isDefault}
						onPress={() => save(DEFAULT_WIDGET_SETTINGS.home.sections)}
						accessibilityLabel={t("widgets.home.reset")}
					>
						<Icon as={RotateCcw} size={16} className="text-foreground" />
						<Text>{t("widgets.home.reset")}</Text>
					</Button>

					<Text className="text-muted-foreground px-1 text-sm font-semibold">
						{session
							? t("widgets.home.savedAccount")
							: t("widgets.home.savedDevice")}
					</Text>
				</View>
			</ScrollView>
		</View>
	);
}
