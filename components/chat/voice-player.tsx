import {
	type AudioPlayer,
	setAudioModeAsync,
	useAudioPlayer,
	useAudioPlayerStatus,
} from "expo-audio";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { type LayoutChangeEvent, Pressable, View } from "react-native";
import { Pause, Play } from "@/components/icons";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { formatVoiceDuration, resampleWaveform } from "@/lib/voice";

const BARS = 32;
const SPEEDS = [1, 1.5, 2] as const;
const FLAT = new Array(BARS).fill(35);

// One voice message at a time, across every chat.
let nowPlaying: AudioPlayer | null = null;
let modeSet = false;

function claimPlayback(player: AudioPlayer) {
	if (nowPlaying && nowPlaying !== player) {
		try {
			nowPlaying.pause();
		} catch {
			// the other player was already released
		}
	}
	nowPlaying = player;
	if (!modeSet) {
		modeSet = true;
		// Play through the speaker even with the ring switch on silent.
		setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
			modeSet = false;
		});
	}
}

type Props = {
	uri: string;
	durationMs?: number | null;
	waveform?: number[] | null;
	onLongPress?: () => void;
	/** Drawn inside another box (the recorder preview): no card of its own. */
	bare?: boolean;
};

type ViewProps = {
	bars: number[];
	playing: boolean;
	positionMs: number;
	totalMs: number;
	speed: (typeof SPEEDS)[number];
	onToggle: () => void;
	onSeek: (fraction: number) => void;
	onSpeed: () => void;
	onLongPress?: () => void;
	bare?: boolean;
};

const VoiceView = memo(function VoiceView({
	bars,
	playing,
	positionMs,
	totalMs,
	speed,
	onToggle,
	onSeek,
	onSpeed,
	onLongPress,
	bare,
}: ViewProps) {
	const { t } = useI18n();
	const width = useRef(0);
	const progress = totalMs > 0 ? Math.min(1, positionMs / totalMs) : 0;
	return (
		<View
			className={`flex-row items-center gap-2.5 ${bare ? "flex-1" : "bg-card border-border w-72 max-w-full self-start rounded-2xl border px-2 py-1.5"}`}
		>
			<Pressable
				onPress={onToggle}
				onLongPress={onLongPress}
				delayLongPress={300}
				accessibilityRole="button"
				accessibilityLabel={
					playing ? t("chat.voicePause") : t("chat.voicePlay")
				}
				className="bg-primary active:opacity-80 h-9 w-9 items-center justify-center rounded-full"
			>
				<Icon
					as={playing ? Pause : Play}
					size={16}
					className="text-primary-foreground"
					fill="currentColor"
				/>
			</Pressable>
			<Pressable
				onPress={(e) => {
					if (width.current > 0)
						onSeek(e.nativeEvent.locationX / width.current);
				}}
				onLongPress={onLongPress}
				delayLongPress={300}
				onLayout={(e: LayoutChangeEvent) => {
					width.current = e.nativeEvent.layout.width;
				}}
				accessibilityRole="adjustable"
				accessibilityLabel={t("chat.voiceMessage")}
				accessibilityValue={{ text: formatVoiceDuration(positionMs) }}
				accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
				onAccessibilityAction={(e) => {
					if (totalMs <= 0) return;
					const step = 5000 / totalMs;
					onSeek(
						progress +
							(e.nativeEvent.actionName === "increment" ? step : -step),
					);
				}}
				className="h-8 min-w-0 flex-1 flex-row items-center gap-[2px]"
			>
				{bars.map((h, i) => (
					<View
						key={i}
						className={`flex-1 rounded-full ${(i + 0.5) / BARS <= progress ? "bg-primary" : "bg-muted-foreground/35"}`}
						style={{ height: `${Math.max(12, h)}%` }}
					/>
				))}
			</Pressable>
			<Text className="text-muted-foreground w-9 text-right text-xs font-semibold">
				{formatVoiceDuration(playing || positionMs > 0 ? positionMs : totalMs)}
			</Text>
			<Pressable
				onPress={onSpeed}
				hitSlop={6}
				accessibilityRole="button"
				accessibilityLabel={t("chat.voiceSpeed", { speed: String(speed) })}
				className="bg-muted h-6 items-center justify-center rounded-full px-1.5"
			>
				<Text className="text-muted-foreground text-[11px] font-bold">
					{speed}x
				</Text>
			</Pressable>
		</View>
	);
});

// Owns the native player. Only mounted once someone presses play, so a chat
// full of voice messages doesn't open a player per message.
function LivePlayer({
	uri,
	totalMs: knownMs,
	bars,
	speed,
	seekFirst,
	onSpeed,
	onLongPress,
	bare,
}: {
	uri: string;
	totalMs: number;
	bars: number[];
	speed: (typeof SPEEDS)[number];
	seekFirst: number | null;
	onSpeed: () => void;
	onLongPress?: () => void;
	bare?: boolean;
}) {
	const player = useAudioPlayer(uri, { updateInterval: 100 });
	const status = useAudioPlayerStatus(player);
	const totalMs =
		knownMs > 0 ? knownMs : status.duration > 0 ? status.duration * 1000 : 0;

	// Where to start, as it was when someone pressed play.
	const start = useRef({ seekFirst, totalMs });

	useEffect(() => {
		claimPlayback(player);
		const { seekFirst: at, totalMs: ms } = start.current;
		if (at !== null && ms > 0) {
			player.seekTo((at * ms) / 1000).catch(() => {});
		}
		player.play();
		return () => {
			if (nowPlaying === player) nowPlaying = null;
		};
	}, [player]);

	useEffect(() => {
		player.setPlaybackRate(speed);
	}, [player, speed]);

	useEffect(() => {
		if (!status.didJustFinish) return;
		player.pause();
		player.seekTo(0).catch(() => {});
	}, [player, status.didJustFinish]);

	const atEnd = status.didJustFinish;
	return (
		<VoiceView
			bars={bars}
			playing={status.playing}
			positionMs={atEnd ? 0 : status.currentTime * 1000}
			totalMs={totalMs}
			speed={speed}
			onToggle={() => {
				if (status.playing) player.pause();
				else {
					claimPlayback(player);
					player.play();
				}
			}}
			onSeek={(f) => {
				if (totalMs <= 0) return;
				const clamped = Math.max(0, Math.min(1, f));
				player.seekTo((clamped * totalMs) / 1000).catch(() => {});
			}}
			onSpeed={onSpeed}
			onLongPress={onLongPress}
			bare={bare}
		/>
	);
}

export const VoicePlayer = memo(function VoicePlayer({
	uri,
	durationMs,
	waveform,
	onLongPress,
	bare,
}: Props) {
	const [live, setLive] = useState(false);
	const [seekFirst, setSeekFirst] = useState<number | null>(null);
	const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
	const bars = useMemo(
		() => (waveform?.length ? resampleWaveform(waveform, BARS) : FLAT),
		[waveform],
	);
	const totalMs = durationMs ?? 0;
	const onSpeed = () =>
		setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]);

	if (live) {
		return (
			<LivePlayer
				uri={uri}
				totalMs={totalMs}
				bars={bars}
				speed={speed}
				seekFirst={seekFirst}
				onSpeed={onSpeed}
				onLongPress={onLongPress}
				bare={bare}
			/>
		);
	}
	return (
		<VoiceView
			bars={bars}
			playing={false}
			positionMs={0}
			totalMs={totalMs}
			speed={speed}
			onToggle={() => setLive(true)}
			onSeek={(f) => {
				setSeekFirst(Math.max(0, Math.min(1, f)));
				setLive(true);
			}}
			onSpeed={onSpeed}
			onLongPress={onLongPress}
			bare={bare}
		/>
	);
});
