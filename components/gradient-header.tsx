import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { Avatar } from "@/components/ui/avatar";
import { Gradient } from "@/components/ui/gradient";
import { Text } from "@/components/ui/text";
import { StorageImage, type StorageKind } from "@/components/storage-image";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { TYPE } from "@/lib/theme/foundations";
import { useTheme } from "@/lib/theme/provider";

type GradientHeaderProps = {
	title: string;
	subtitle?: string;
	bannerFileId?: string | null;
	bannerBlurhash?: string | null;
	bannerKind?: StorageKind;
	avatar?: { fileId?: string | null; name?: string | null };
	scrollY: SharedValue<number>;
	expandedHeight?: number;
	collapsedHeight?: number;
	actions?: ReactNode;
};

export function GradientHeader({
	title,
	subtitle,
	bannerFileId,
	bannerBlurhash,
	bannerKind = "banner",
	avatar,
	scrollY,
	expandedHeight = 220,
	collapsedHeight = 96,
	actions,
}: GradientHeaderProps) {
	const { colors } = useTheme();
	const reduced = useReducedMotion();
	const range = expandedHeight - collapsedHeight;

	const containerStyle = useAnimatedStyle(() => {
		if (reduced) return { height: expandedHeight };
		return {
			height: interpolate(
				scrollY.value,
				[0, range],
				[expandedHeight, collapsedHeight],
				Extrapolation.CLAMP,
			),
		};
	});

	const bannerStyle = useAnimatedStyle(() => {
		if (reduced) return { transform: [{ translateY: 0 }] };
		return {
			transform: [
				{
					translateY: interpolate(
						scrollY.value,
						[0, range],
						[0, -range * 0.5],
						Extrapolation.CLAMP,
					),
				},
			],
		};
	});

	const scrimStyle = useAnimatedStyle(() => {
		if (reduced) return { opacity: 1 };
		return {
			opacity: interpolate(
				scrollY.value,
				[0, range],
				[0.85, 1],
				Extrapolation.CLAMP,
			),
		};
	});

	const titleStyle = useAnimatedStyle(() => {
		if (reduced) return { opacity: 1 };
		return {
			opacity: interpolate(
				scrollY.value,
				[0, range * 0.6],
				[1, 0],
				Extrapolation.CLAMP,
			),
		};
	});

	return (
		<Animated.View style={[styles.container, containerStyle]}>
			<Animated.View style={[StyleSheet.absoluteFill, bannerStyle]}>
				{bannerFileId ? (
					<StorageImage
						kind={bannerKind}
						fileId={bannerFileId}
						blurhash={bannerBlurhash}
						style={StyleSheet.absoluteFill}
						contentFit="cover"
						accessibilityLabel={`${title} banner`}
					/>
				) : (
					<Gradient
						style={StyleSheet.absoluteFill}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
					/>
				)}
			</Animated.View>

			<Animated.View style={[styles.scrim, scrimStyle]}>
				<Gradient
					colors={["transparent", colors.background]}
					start={{ x: 0, y: 0 }}
					end={{ x: 0, y: 1 }}
					style={StyleSheet.absoluteFill}
				/>
			</Animated.View>

			{actions ? <View style={styles.actions}>{actions}</View> : null}

			<Animated.View style={[styles.content, titleStyle]}>
				{avatar ? (
					<View style={styles.avatarRing}>
						<Gradient
							style={StyleSheet.absoluteFill}
							borderRadius={32}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
						/>
						<Avatar fileId={avatar.fileId} name={avatar.name} size={56} />
					</View>
				) : null}
				<View style={styles.titles}>
					<Text
						numberOfLines={1}
						style={[TYPE.display, { color: colors["primary-foreground"] }]}
					>
						{title}
					</Text>
					{subtitle ? (
						<Text
							numberOfLines={1}
							style={[
								TYPE.small,
								{ color: colors["primary-foreground"], opacity: 0.85 },
							]}
						>
							{subtitle}
						</Text>
					) : null}
				</View>
			</Animated.View>
		</Animated.View>
	);
}

export const Hero = GradientHeader;

const styles = StyleSheet.create({
	container: {
		width: "100%",
		overflow: "hidden",
		justifyContent: "flex-end",
	},
	scrim: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	actions: {
		position: "absolute",
		top: 12,
		right: 12,
		flexDirection: "row",
		gap: 8,
		zIndex: 2,
	},
	content: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
	avatarRing: {
		width: 60,
		height: 60,
		borderRadius: 30,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	titles: {
		flex: 1,
	},
});
