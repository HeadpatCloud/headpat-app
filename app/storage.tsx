import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/card";
import { GradientText } from "@/components/ui/gradient-text";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import {
	clearCollections,
	eventCollection,
	galleryCollection,
	galleryPostCollection,
	profileCollection,
} from "@/lib/db/collections";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { cacheSize, persister, queryClient } from "@/lib/query";

function readOffline() {
	return {
		gallery: { status: galleryCollection.status, rows: galleryCollection.size },
		posts: {
			status: galleryPostCollection.status,
			rows: galleryPostCollection.size,
		},
		events: { status: eventCollection.status, rows: eventCollection.size },
		profiles: {
			status: profileCollection.status,
			rows: profileCollection.size,
		},
	};
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Storage() {
	const insets = useSafeAreaInsets();
	const { t } = useI18n();
	const sheetRef = useRef<BottomSheetModal>(null);
	const [bytes, setBytes] = useState<number | null>(null);
	const [busy, setBusy] = useState(false);
	const [offline, setOffline] = useState(readOffline);

	// The persisted client is one JSON string, so its length is the cache's
	// on-disk size. expo-image's disk cache size isn't exposed by the native
	// module, so it can be cleared but not measured.
	const measure = useCallback(() => {
		setBytes(cacheSize());
	}, []);

	useEffect(() => {
		measure();
	}, [measure]);

	// Preloading is also what instantiates the collections and their SQLite
	// tables, so this screen is where offline storage can be confirmed working.
	useEffect(() => {
		let cancelled = false;
		Promise.all([
			galleryCollection.preload().catch(() => {}),
			eventCollection.preload().catch(() => {}),
		]).finally(() => {
			if (!cancelled) setOffline(readOffline());
		});
		return () => {
			cancelled = true;
		};
	}, []);

	async function clear() {
		setBusy(true);
		sheetRef.current?.dismiss();
		// Auth lives in SecureStore and is never touched here — clearing the cache
		// must not sign the user out.
		queryClient.clear();
		persister.removeClient();
		clearCollections();
		await Promise.all([
			Image.clearMemoryCache().catch(() => false),
			Image.clearDiskCache().catch(() => false),
		]);
		measure();
		setOffline(readOffline());
		setBusy(false);
	}

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerClassName="gap-5 p-6"
			contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
		>
			<AnimatedEntrance index={0}>
				<GlowCard className="gap-2 p-5">
					<GradientText className="text-2xl font-extrabold tracking-tight">
						{t("storage.cache.title")}
					</GradientText>
					<Text variant="muted">{t("storage.cache.body")}</Text>
					<Text variant="large" className="pt-2">
						{bytes === null ? "…" : formatBytes(bytes)}
					</Text>
				</GlowCard>
			</AnimatedEntrance>

			<AnimatedEntrance index={1}>
				<GlowCard className="gap-2 p-5">
					<Text variant="large">{t("storage.offline.title")}</Text>
					<Text variant="muted">{t("storage.offline.body")}</Text>
					<Text variant="small" className="text-muted-foreground pt-1">
						{t("storage.offline.gallery", {
							count: offline.gallery.rows,
							status: offline.gallery.status,
						})}
					</Text>
					<Text variant="small" className="text-muted-foreground">
						{t("storage.offline.posts", {
							count: offline.posts.rows,
							status: offline.posts.status,
						})}
					</Text>
					<Text variant="small" className="text-muted-foreground">
						{t("storage.offline.events", {
							count: offline.events.rows,
							status: offline.events.status,
						})}
					</Text>
					<Text variant="small" className="text-muted-foreground">
						{t("storage.offline.profiles", {
							count: offline.profiles.rows,
							status: offline.profiles.status,
						})}
					</Text>
				</GlowCard>
			</AnimatedEntrance>

			<AnimatedEntrance index={2}>
				<Button
					variant="destructive"
					fullWidth
					loading={busy}
					onPress={() => sheetRef.current?.present()}
					accessibilityRole="button"
					accessibilityLabel={t("storage.cache.action")}
				>
					<Text>{t("storage.cache.action")}</Text>
				</Button>
			</AnimatedEntrance>

			<Sheet ref={sheetRef} title={t("storage.cache.confirmTitle")} accent>
				<View className="gap-3">
					<Text variant="muted">{t("storage.cache.confirmBody")}</Text>
					<View className="gap-3 pt-1">
						<Button
							variant="destructive"
							onPress={clear}
							accessibilityRole="button"
							accessibilityLabel={t("storage.cache.action")}
						>
							<Text>{t("storage.cache.action")}</Text>
						</Button>
						<Button
							variant="outline"
							onPress={() => sheetRef.current?.dismiss()}
							accessibilityRole="button"
							accessibilityLabel={t("common.cancel")}
						>
							<Text>{t("common.cancel")}</Text>
						</Button>
					</View>
				</View>
			</Sheet>
		</ScrollView>
	);
}
