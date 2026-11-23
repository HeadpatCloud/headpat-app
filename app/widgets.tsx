import { router } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";
import { SectionCard } from "@/components/ui/section-card";
import { Text } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import type { AndroidWidgetName } from "@/widgets/android-ui/render";
import {
	CAN_PIN_WIDGETS,
	HAS_HOME_WIDGETS,
	pinWidget,
	WidgetLivePreview,
} from "@/widgets/preview";
import type { WidgetTheme } from "@/widgets/settings";
import { refreshWidgets } from "@/widgets/update";
import { useWidgetSettings } from "@/widgets/use-widgets";

const PREVIEW_HEIGHT = 150;

function SettingRow({
	title,
	hint,
	value,
	onChange,
}: {
	title: string;
	hint: string;
	value: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<View className="flex-row items-center gap-3">
			<View className="flex-1 gap-0.5">
				<Text className="font-extrabold">{title}</Text>
				<Text className="text-muted-foreground text-sm font-semibold">
					{hint}
				</Text>
			</View>
			<Toggle
				value={value}
				onValueChange={onChange}
				accessibilityLabel={title}
			/>
		</View>
	);
}

function WidgetCard({
	name,
	title,
	theme,
	version,
	width,
	children,
}: {
	name: AndroidWidgetName;
	title: string;
	theme: WidgetTheme;
	version: number;
	width: number;
	children: ReactNode;
}) {
	const { t } = useI18n();
	const add = async () => {
		const ok = await pinWidget(name);
		if (!ok) Alert.alert(title, t("widgets.settings.addManually"));
	};
	return (
		<SectionCard title={title}>
			{CAN_PIN_WIDGETS && width > 0 ? (
				// A muted backdrop stands in for the home screen, so the
				// widget's own card edge stays visible.
				<View className="bg-muted items-center rounded-3xl p-3">
					<WidgetLivePreview
						name={name}
						theme={theme}
						width={width - 24}
						height={PREVIEW_HEIGHT}
						version={version}
					/>
				</View>
			) : null}
			{children}
			{CAN_PIN_WIDGETS ? (
				<Button
					variant="outline"
					onPress={add}
					accessibilityLabel={t("widgets.settings.add")}
				>
					<Text>{t("widgets.settings.add")}</Text>
				</Button>
			) : null}
		</SectionCard>
	);
}

export default function WidgetSettingsScreen() {
	const insets = useSafeAreaInsets();
	const { t } = useI18n();
	const { data: session } = useSession();
	const { settings, update } = useWidgetSettings();
	const [version, setVersion] = useState(0);
	const [cardWidth, setCardWidth] = useState(0);
	const bump = () => setVersion((v) => v + 1);

	// Fresh data for the previews when the screen opens.
	useEffect(() => {
		refreshWidgets()
			.catch(() => {})
			.finally(() => setVersion((v) => v + 1));
	}, []);

	const themeTabs = [
		{ key: "app", label: t("widgets.settings.themeApp") },
		{ key: "light", label: t("widgets.settings.themeLight") },
		{ key: "dark", label: t("widgets.settings.themeDark") },
	];

	return (
		<View className="bg-background flex-1">
			<ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
				<AnimatedEntrance index={0} className="px-4">
					<PageTitle
						title={t("widgets.settings.title")}
						subtitle={t("widgets.settings.subtitle")}
					/>
				</AnimatedEntrance>

				<View
					className="gap-4 px-4 pb-4 pt-2"
					onLayout={(e) => setCardWidth(e.nativeEvent.layout.width - 32 - 40)}
				>
					<AnimatedEntrance index={1}>
						<SectionCard
							title={t("widgets.home.cardTitle")}
							link={{
								label: t("widgets.home.customize"),
								onPress: () => router.push("/home-layout"),
							}}
						>
							<Text className="text-muted-foreground font-semibold">
								{t("widgets.home.cardText")}
							</Text>
						</SectionCard>
					</AnimatedEntrance>

					{HAS_HOME_WIDGETS ? (
						<>
							<AnimatedEntrance index={1} className="gap-3">
								<Text variant="caption" accessibilityRole="header">
									{t("widgets.settings.colors")}
								</Text>
								<SegmentedTabs
									tabs={themeTabs}
									value={settings.theme}
									onChange={(key) =>
										update((s) => ({ ...s, theme: key as WidgetTheme })).then(
											bump,
										)
									}
								/>
							</AnimatedEntrance>

							<AnimatedEntrance index={2}>
								<WidgetCard
									name="NextEvent"
									title={t("widgets.event.label")}
									theme={settings.theme}
									version={version}
									width={cardWidth}
								>
									<SettingRow
										title={t("widgets.settings.publicEvents")}
										hint={t("widgets.settings.publicEventsHint")}
										value={settings.nextEvent.includePublic}
										onChange={(v) =>
											update((s) => ({
												...s,
												nextEvent: { includePublic: v },
											})).then(bump)
										}
									/>
								</WidgetCard>
							</AnimatedEntrance>

							<AnimatedEntrance index={3}>
								<WidgetCard
									name="Chats"
									title={t("widgets.chats.label")}
									theme={settings.theme}
									version={version}
									width={cardWidth}
								>
									<SettingRow
										title={t("widgets.settings.chatPreviews")}
										hint={t("widgets.settings.chatPreviewsHint")}
										value={settings.chats.showPreviews}
										onChange={(v) =>
											update((s) => ({
												...s,
												chats: { showPreviews: v },
											})).then(bump)
										}
									/>
								</WidgetCard>
							</AnimatedEntrance>

							<AnimatedEntrance index={4}>
								<Text className="text-muted-foreground px-1 text-sm font-semibold">
									{session
										? t("widgets.settings.savedAccount")
										: t("widgets.settings.savedDevice")}
									{CAN_PIN_WIDGETS ? "" : ` ${t("widgets.settings.addHowTo")}`}
								</Text>
							</AnimatedEntrance>
						</>
					) : (
						<AnimatedEntrance index={2}>
							<Text className="text-muted-foreground px-1 text-sm font-semibold">
								{t("widgets.settings.noWidgets")}
							</Text>
						</AnimatedEntrance>
					)}
				</View>
			</ScrollView>
		</View>
	);
}
