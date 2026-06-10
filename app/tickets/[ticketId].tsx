import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns/format";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Send } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

export default function Ticket() {
	const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
	const insets = useSafeAreaInsets();
	const qc = useQueryClient();
	const { data, isLoading } = useQuery(
		orpc.ticket.get.queryOptions({ input: { ticketId } }),
	);

	const [reply, setReply] = useState("");
	const [sending, setSending] = useState(false);
	const [statusBusy, setStatusBusy] = useState(false);

	const refresh = () =>
		qc.invalidateQueries({
			queryKey: orpc.ticket.get.key({ input: { ticketId } }),
		});

	const getKey = orpc.ticket.get.queryOptions({ input: { ticketId } }).queryKey;

	const send = async () => {
		const body = reply.trim();
		if (body.length === 0 || sending) return;
		setSending(true);
		try {
			// Server-confirmed row goes straight into the cache — the reply shows
			// after one roundtrip instead of waiting for a full refetch.
			const msg = await client.ticket.reply({ ticketId, body });
			setReply("");
			qc.setQueryData(
				getKey,
				(old) => old && { ...old, messages: [...old.messages, msg] },
			);
			refresh();
		} catch (e) {
			Alert.alert("Couldn't send", humanizeError(e));
		} finally {
			setSending(false);
		}
	};

	const setStatus = async (status: "open" | "closed") => {
		if (statusBusy) return;
		setStatusBusy(true);
		try {
			const row = await client.ticket.setStatus({ ticketId, status });
			qc.setQueryData(getKey, (old) => old && { ...old, status: row.status });
			refresh();
			qc.invalidateQueries({ queryKey: orpc.ticket.myList.key() });
		} catch (e) {
			Alert.alert("Couldn't update ticket", humanizeError(e));
		} finally {
			setStatusBusy(false);
		}
	};

	if (isLoading) {
		return (
			<View className="bg-background flex-1 gap-3 p-4">
				<Skeleton className="h-8 w-2/3" />
				<Skeleton className="h-20 w-full" />
				<Skeleton className="h-20 w-full" />
			</View>
		);
	}

	if (!data) {
		return (
			<View className="bg-background flex-1 p-4">
				<Text variant="muted">This ticket is no longer available.</Text>
			</View>
		);
	}

	const isOpen = data.status === "open";

	return (
		<KeyboardAvoidingView
			className="bg-background flex-1"
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}
		>
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ padding: 16, gap: 12 }}
				keyboardShouldPersistTaps="handled"
			>
				<View className="flex-row items-start justify-between gap-2">
					<Text variant="h3" className="flex-1">
						{data.subject}
					</Text>
					<Badge variant={isOpen ? "default" : "secondary"}>
						{isOpen ? "Open" : "Closed"}
					</Badge>
				</View>
				<Text variant="small" className="text-muted-foreground capitalize">
					{data.category} · {data.priority} priority
				</Text>

				<View className="gap-3 pt-2">
					{data.messages.map((m) => (
						<Card key={m.id} className="gap-1.5 p-3">
							<View className="flex-row items-center justify-between">
								<Text variant="small" className="font-semibold">
									{m.isStaff ? "Support" : "You"}
								</Text>
								<Text variant="small" className="text-muted-foreground">
									{format(new Date(m.createdAt), "MMM d, h:mm a")}
								</Text>
							</View>
							<Text className="text-foreground leading-6">{m.body}</Text>
						</Card>
					))}
				</View>

				<Button
					variant="outline"
					loading={statusBusy}
					onPress={() => setStatus(isOpen ? "closed" : "open")}
					accessibilityRole="button"
					accessibilityLabel={isOpen ? "Close ticket" : "Reopen ticket"}
					className="mt-2"
				>
					<Text>{isOpen ? "Close ticket" : "Reopen ticket"}</Text>
				</Button>
			</ScrollView>

			<View
				className="border-border bg-background flex-row items-end gap-2 border-t p-3"
				style={{ paddingBottom: insets.bottom + 12 }}
			>
				<Input
					placeholder="Write a reply"
					value={reply}
					onChangeText={setReply}
					multiline
					className="max-h-28"
					containerClassName="flex-1"
					accessibilityLabel="Reply"
				/>
				<Button
					size="icon"
					loading={sending}
					disabled={reply.trim().length === 0}
					onPress={send}
					accessibilityRole="button"
					accessibilityLabel="Send reply"
				>
					<Icon as={Send} size={18} className="text-primary-foreground" />
				</Button>
			</View>
		</KeyboardAvoidingView>
	);
}
