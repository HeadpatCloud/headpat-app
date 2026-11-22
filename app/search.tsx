import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { type PersonSummary, PersonRow } from "@/components/person-row";
import { StorageImage } from "@/components/storage-image";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { orpc } from "@/lib/orpc";
import { useTheme } from "@/lib/theme/provider";
import { useDebouncedValue } from "@/lib/use-debounced-value";

type Kind = "all" | "profiles" | "communities" | "events" | "gallery";
const KINDS: { key: Kind; label: string }[] = [
	{ key: "all", label: "search.all" },
	{ key: "profiles", label: "search.people" },
	{ key: "communities", label: "search.communities" },
	{ key: "events", label: "search.events" },
	{ key: "gallery", label: "search.gallery" },
];

// The website's /search page: one field, filter chips, results by kind.
export default function SearchScreen() {
	const { t, locale } = useI18n();
	const { colors } = useTheme();
	const [q, setQ] = useState("");
	const [kind, setKind] = useState<Kind>("all");
	const term = useDebouncedValue(q.trim());
	const results = useQuery({
		...orpc.search.query.queryOptions({
			input: { q: term, type: kind, limit: kind === "all" ? 6 : 24 },
		}),
		enabled: term.length > 0,
		placeholderData: (prev) => prev,
	});
	const openPerson = useCallback(
		(p: PersonSummary) => router.push(`/user/${p.profileUrl}`),
		[],
	);
	const data = term ? results.data : undefined;
	const nothing =
		data &&
		!data.profiles.length &&
		!data.communities.length &&
		!data.events.length &&
		!data.gallery.length;
	const more = (k: Kind) =>
		kind === "all"
			? { label: t("search.showAll"), onPress: () => setKind(k) }
			: undefined;

	return (
		<View className="bg-background flex-1">
			<View className="gap-3 px-4 pt-2">
				<Input
					value={q}
					onChangeText={setQ}
					placeholder={t("search.placeholder")}
					autoFocus
					autoCorrect={false}
					autoCapitalize="none"
					returnKeyType="search"
				/>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ gap: 8 }}
				>
					{KINDS.map((k) => (
						<Pressable
							key={k.key}
							onPress={() => setKind(k.key)}
							accessibilityRole="button"
							accessibilityState={{ selected: kind === k.key }}
							className={`rounded-full border px-4 py-2 ${kind === k.key ? "bg-primary border-primary" : "bg-card border-border"}`}
						>
							<Text
								className={`text-sm font-extrabold ${kind === k.key ? "text-primary-foreground" : "text-foreground"}`}
							>
								{t(k.label)}
							</Text>
						</Pressable>
					))}
				</ScrollView>
			</View>
			<ScrollView
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{ padding: 16, gap: 16 }}
			>
				{results.isFetching ? (
					<ActivityIndicator color={colors.primary} />
				) : null}
				{!term ? (
					<Text className="text-muted-foreground py-6 text-center font-semibold">
						{t("search.prompt")}
					</Text>
				) : nothing ? (
					<Text className="text-muted-foreground py-6 text-center font-semibold">
						{t("search.empty", { q: term })}
					</Text>
				) : null}
				{data?.profiles.length ? (
					<SectionCard title={t("search.people")} link={more("profiles")}>
						<View className="-mx-2">
							{data.profiles.map((p) => (
								<PersonRow key={p.userId} person={p} onPress={openPerson} />
							))}
						</View>
					</SectionCard>
				) : null}
				{data?.communities.length ? (
					<SectionCard
						title={t("search.communities")}
						link={more("communities")}
					>
						{data.communities.map((c) => (
							<Pressable
								key={c.id}
								onPress={() => router.push(`/community/${c.id}`)}
								accessibilityRole="button"
								accessibilityLabel={c.name}
								className="active:bg-muted -mx-2 flex-row items-center gap-3 rounded-2xl p-2"
							>
								<Avatar
									fileId={c.avatarFileId}
									name={c.name}
									size={44}
									kind="community-avatar"
								/>
								<View className="min-w-0 flex-1">
									<Text numberOfLines={1} className="font-extrabold">
										{c.name}
									</Text>
									<Text className="text-muted-foreground text-sm font-semibold">
										{t("search.followers", { count: c.followersCount })}
									</Text>
								</View>
							</Pressable>
						))}
					</SectionCard>
				) : null}
				{data?.events.length ? (
					<SectionCard title={t("search.events")} link={more("events")}>
						{data.events.map((e) => (
							<Pressable
								key={e.id}
								onPress={() => router.push(`/event/${e.id}`)}
								accessibilityRole="button"
								accessibilityLabel={e.title}
								className="bg-primary/10 active:opacity-80 rounded-2xl p-3.5"
							>
								<Text numberOfLines={1} className="font-extrabold">
									{e.title}
								</Text>
								<Text
									numberOfLines={1}
									className="text-muted-foreground text-sm font-semibold"
								>
									{new Date(e.startsAt).toLocaleDateString(locale, {
										weekday: "short",
										day: "numeric",
										month: "short",
									})}
									{e.locationText ? ` · ${e.locationText}` : ""}
								</Text>
							</Pressable>
						))}
					</SectionCard>
				) : null}
				{data?.gallery.length ? (
					<SectionCard title={t("search.gallery")} link={more("gallery")}>
						<View className="flex-row flex-wrap" style={{ margin: -5 }}>
							{data.gallery.map((g) => (
								<Pressable
									key={g.id}
									onPress={() => router.push(`/post/${g.id}`)}
									accessibilityRole="imagebutton"
									accessibilityLabel={g.name}
									style={{ width: "33.33%", padding: 5 }}
								>
									<StorageImage
										kind="gallery"
										fileId={g.fileId}
										variant="640"
										style={{ aspectRatio: 1, width: "100%", borderRadius: 16 }}
										accessibilityLabel={g.name}
									/>
								</Pressable>
							))}
						</View>
					</SectionCard>
				) : null}
			</ScrollView>
		</View>
	);
}
