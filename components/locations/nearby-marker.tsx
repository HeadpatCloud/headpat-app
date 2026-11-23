import { Marker } from "@maplibre/maplibre-react-native";
import { router } from "expo-router";
import { View } from "react-native";
import { StorageImage } from "@/components/storage-image";
import { Text } from "@/components/ui/text";
import type { LngLat } from "@/lib/location/geo";
import type { NearbyPerson } from "@/lib/location/nearby";

export const NEARBY_COLOR = "#6366f1";
const SIZE = 38;
const INNER = SIZE - 6;

// A "who's around" person at their fuzzed cell. Dashed ring and a smaller
// avatar than a live share, so it never reads as an exact position.
export function NearbyMarker({ p, at }: { p: NearbyPerson; at: LngLat }) {
	const name = p.displayName || p.name || p.profileUrl || "?";
	const letter = name.trim().charAt(0).toUpperCase() || "?";
	return (
		<Marker
			id={`nearby-${p.userId}`}
			lngLat={at}
			anchor="center"
			onPress={() => {
				if (p.profileUrl) router.push(`/user/${p.profileUrl}` as never);
			}}
		>
			<View className="items-center gap-1">
				<View
					style={{
						width: SIZE,
						height: SIZE,
						borderRadius: SIZE / 2,
						borderWidth: 3,
						borderStyle: "dashed",
						borderColor: NEARBY_COLOR,
						backgroundColor: "#fff",
						alignItems: "center",
						justifyContent: "center",
						overflow: "hidden",
					}}
				>
					{p.avatarFileId ? (
						<StorageImage
							kind="avatar"
							fileId={p.avatarFileId}
							variant="sm"
							transition={0}
							style={{ width: INNER, height: INNER, borderRadius: INNER / 2 }}
						/>
					) : (
						<View
							style={{
								width: INNER,
								height: INNER,
								borderRadius: INNER / 2,
								backgroundColor: NEARBY_COLOR,
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Text
								style={{
									color: "#fff",
									fontWeight: "700",
									fontSize: INNER * 0.45,
								}}
							>
								{letter}
							</Text>
						</View>
					)}
				</View>
				<View className="max-w-[140px] rounded-full bg-black/70 px-2 py-0.5">
					<Text
						className="text-[10px] font-semibold text-white"
						numberOfLines={1}
					>
						{name}
					</Text>
				</View>
			</View>
		</Marker>
	);
}
