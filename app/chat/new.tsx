import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { type PersonSummary, PersonRow } from "@/components/person-row";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";
import { useTheme } from "@/lib/theme/provider";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const keyOf = (p: PersonSummary) => p.userId;

// Pick someone to message: opens (or reuses) the direct conversation.
export default function NewConversation() {
	const { t } = useI18n();
	const { colors } = useTheme();
	const [q, setQ] = useState("");
	const term = useDebouncedValue(q.trim());
	const results = useQuery({
		...orpc.search.query.queryOptions({
			input: { q: term, type: "profiles", limit: 24 },
		}),
		enabled: term.length > 0,
		placeholderData: (prev) => prev,
	});
	const open = useMutation({
		mutationFn: (userId: string) => orpc.message.openDirect.call({ userId }),
		onSuccess: ({ conversationId }) =>
			router.replace(`/chat/${conversationId}`),
		onError: (e) => Alert.alert(t("common.error"), humanizeError(e)),
	});
	const onPick = useCallback(
		(p: PersonSummary) => open.mutate(p.userId),
		[open.mutate],
	);
	const people = term ? (results.data?.profiles ?? []) : [];

	return (
		<View className="bg-background flex-1 px-4 pt-2">
			<Input
				value={q}
				onChangeText={setQ}
				placeholder={t("chat.findPeoplePlaceholder")}
				autoFocus
				autoCapitalize="none"
				autoCorrect={false}
				returnKeyType="search"
				containerClassName="pb-3"
			/>
			{open.isPending || results.isFetching ? (
				<ActivityIndicator className="py-2" color={colors.primary} />
			) : null}
			<FlashList
				data={people}
				keyExtractor={keyOf}
				keyboardShouldPersistTaps="handled"
				renderItem={({ item }) => <PersonRow person={item} onPress={onPick} />}
				ListEmptyComponent={
					<Text className="text-muted-foreground px-2 py-6 text-center font-semibold">
						{term ? t("chat.emptySearch") : t("chat.typeToFindPeople")}
					</Text>
				}
			/>
		</View>
	);
}
