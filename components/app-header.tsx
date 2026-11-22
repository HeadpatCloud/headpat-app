import { router } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderControls } from "@/components/header-controls";
import { Search } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";

// The website's floating top bar: a rounded card holding the search field and
// the quick controls. Used as the header of every tab's root screen.
function AppHeaderImpl() {
	const insets = useSafeAreaInsets();
	const { t } = useI18n();
	return (
		<View
			className="bg-background px-3 pb-2"
			style={{ paddingTop: insets.top + 8 }}
		>
			<View
				className="bg-card border-border flex-row items-center gap-1 rounded-3xl border p-1.5"
				style={styles.shadow}
			>
				<Pressable
					onPress={() => router.push("/search")}
					accessibilityRole="search"
					accessibilityLabel={t("header.searchLabel")}
					className="bg-muted active:opacity-80 h-11 flex-1 flex-row items-center gap-2.5 rounded-full px-4"
				>
					<Icon as={Search} size={18} className="text-muted-foreground" />
					<Text
						numberOfLines={1}
						className="text-muted-foreground flex-1 font-semibold"
					>
						{t("header.searchPlaceholder")}
					</Text>
				</Pressable>
				<HeaderControls />
			</View>
		</View>
	);
}

export const AppHeader = memo(AppHeaderImpl);

const styles = StyleSheet.create({
	shadow: { boxShadow: "0 4 12 rgba(23, 51, 42, 0.08)" },
});

const renderAppHeader = () => <AppHeader />;

// Screen options for a tab's root screen: the floating header instead of the
// native one. A constant, so stack screens get a stable options object.
export const TAB_ROOT_OPTIONS = { header: renderAppHeader } as const;
