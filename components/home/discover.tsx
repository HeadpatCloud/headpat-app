import { router } from "expo-router";
import { memo, useCallback } from "react";
import { Pressable, View } from "react-native";
import { type PersonSummary, PersonRow } from "@/components/person-row";
import { StorageImage } from "@/components/storage-image";
import { SectionCard } from "@/components/ui/section-card";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import type { client } from "@/lib/orpc";

type Community = Awaited<
	ReturnType<typeof client.community.list>
>["items"][number];
type GalleryItem = Awaited<
	ReturnType<typeof client.gallery.list>
>["items"][number];

export const DiscoverCommunities = memo(function DiscoverCommunities({
	communities,
}: {
	communities: Community[];
}) {
	const { t } = useI18n();
	if (!communities.length) return null;
	return (
		<SectionCard
			title={t("home.discoverCommunities")}
			link={{
				label: t("home.seeAll"),
				onPress: () => router.push("/community"),
			}}
		>
			<View className="flex-row flex-wrap" style={{ margin: -6 }}>
				{communities.map((c) => (
					<View key={c.id} style={{ width: "50%", padding: 6 }}>
						<Pressable
							onPress={() => router.push(`/community/${c.id}`)}
							accessibilityRole="button"
							accessibilityLabel={c.name}
							className="bg-background active:opacity-80 gap-3 rounded-2xl p-4"
						>
							{c.avatarFileId ? (
								<StorageImage
									kind="community-avatar"
									fileId={c.avatarFileId}
									variant="sm"
									style={{ width: 52, height: 52, borderRadius: 16 }}
									accessibilityLabel={c.name}
								/>
							) : (
								<View
									className="bg-primary items-center justify-center rounded-2xl"
									style={{ width: 52, height: 52 }}
								>
									<Text className="font-display text-primary-foreground text-xl font-semibold">
										{c.name.slice(0, 1).toUpperCase()}
									</Text>
								</View>
							)}
							<View>
								<Text numberOfLines={1} className="font-extrabold">
									{c.name}
								</Text>
								<Text className="text-muted-foreground text-sm font-semibold">
									{t("home.followers", { count: c.followersCount })}
								</Text>
							</View>
						</Pressable>
					</View>
				))}
			</View>
		</SectionCard>
	);
});

export const SayHi = memo(function SayHi({
	people,
}: {
	people: PersonSummary[];
}) {
	const { t } = useI18n();
	const open = useCallback(
		(p: PersonSummary) => router.push(`/user/${p.profileUrl}`),
		[],
	);
	if (!people.length) return null;
	return (
		<SectionCard
			title={t("home.sayHi")}
			link={{
				label: t("home.morePeople"),
				onPress: () => router.push("/users"),
			}}
		>
			<View className="-mx-2 -my-1">
				{people.map((p) => (
					<PersonRow key={p.userId} person={p} onPress={open} />
				))}
			</View>
		</SectionCard>
	);
});

export const FreshGallery = memo(function FreshGallery({
	items,
}: {
	items: GalleryItem[];
}) {
	const { t } = useI18n();
	if (!items.length) return null;
	return (
		<SectionCard
			title={t("home.freshGallery")}
			link={{
				label: t("home.openGallery"),
				onPress: () => router.push("/gallery"),
			}}
		>
			<View className="flex-row flex-wrap" style={{ margin: -6 }}>
				{items.map((g) => (
					<Pressable
						key={g.id}
						onPress={() => router.push(`/post/${g.id}`)}
						accessibilityRole="imagebutton"
						accessibilityLabel={g.name}
						style={{ width: "50%", padding: 6 }}
					>
						<StorageImage
							kind="gallery"
							fileId={g.fileId}
							variant="640"
							blurhash={g.blurHash}
							style={{ aspectRatio: 4 / 5, width: "100%", borderRadius: 16 }}
							accessibilityLabel={g.name}
						/>
					</Pressable>
				))}
			</View>
		</SectionCard>
	);
});
