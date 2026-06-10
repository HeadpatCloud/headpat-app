import { memo } from "react";
import { TextInput, View } from "react-native";
import { TriangleAlert } from "@/components/icons";
import { ContrastBadge } from "@/components/theme/contrast-badge";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { PressableScale } from "@/lib/motion/pressable-scale";
import { useTheme } from "@/lib/theme/provider";
import type { TokenKey } from "@/lib/theme/tokens";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

type ColorPickerRowProps = {
	token: TokenKey;
	value: string;
	onChangeToken: (token: TokenKey, value: string) => void;
	onPick: (token: TokenKey) => void;
	// When this token is the foreground of a WCAG pair: its background hex +
	// the pair's minimum ratio, rendered as a ContrastBadge.
	contrastBg?: string;
	threshold?: number;
};

function ColorPickerRowImpl({
	token,
	value,
	onChangeToken,
	onPick,
	contrastBg,
	threshold,
}: ColorPickerRowProps) {
	const { t } = useI18n();
	const { colors } = useTheme();
	const valid = HEX_RE.test(value);
	return (
		<View className="gap-1">
			<View className="flex-row items-center gap-3" style={{ minHeight: 48 }}>
				<PressableScale
					onPress={() => onPick(token)}
					accessibilityRole="button"
					accessibilityLabel={t("themeBuilder.pickColor", { token })}
				>
					<View
						style={{
							width: 44,
							height: 44,
							borderRadius: 12,
							backgroundColor: valid ? value : "#000000",
							borderWidth: 1,
							borderColor: colors.border,
						}}
					/>
				</PressableScale>
				<View className="flex-1 items-start gap-1">
					<Text className="text-foreground text-sm" numberOfLines={1}>
						{token}
					</Text>
					{contrastBg && threshold ? (
						<ContrastBadge fg={value} bg={contrastBg} threshold={threshold} />
					) : null}
				</View>
				<TextInput
					value={value}
					onChangeText={(text) => onChangeToken(token, text)}
					autoCapitalize="none"
					autoCorrect={false}
					accessibilityLabel={t("themeBuilder.hexA11y", { token })}
					className={`text-foreground w-28 rounded-xl border px-3 py-2 text-sm ${valid ? "border-border" : "border-destructive"}`}
					placeholder="#000000"
					placeholderTextColor={colors["muted-foreground"]}
				/>
			</View>
			{!valid ? (
				<View
					className="flex-row items-center gap-1.5 pl-1"
					accessibilityRole="alert"
				>
					<Icon as={TriangleAlert} size={14} className="text-destructive" />
					<Text variant="small" className="text-destructive">
						{t("themeBuilder.invalidHex")}
					</Text>
				</View>
			) : null}
		</View>
	);
}

export const ColorPickerRow = memo(ColorPickerRowImpl);
