import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns/format";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/empty-state";
import { LifeBuoy, Send } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n/provider";
import { AnimatedEntrance } from "@/lib/motion/animated-entrance";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { durations } from "@/lib/motion/springs";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

export default function Ticket() {
	const { t } = useI18n();
	const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
	const insets = useSafeAreaInsets();
	const qc = useQueryClient();
	const reduced = useReducedMotion();
	const { data, isLoading } = useQuery(
		orpc.ticket.get.queryOptions({ input: { ticketId } }),
	);

	const [reply, setReply] = useState("");
	const [sending, setSending] = useState(false);
	const [statusBusy, setStatusBusy] = useState(false);
	// Messages present on first load stagger in; later appends rise from the
	// composer instead of replaying the whole cascade.
	const initialCount = useRef(-1);
	if (data && initialCount.current === -1) {
		initialCount.current = data.messages.length;
	}

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
			Alert.alert(t("tickets.detail.sendError"), humanizeError(e));
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
			Alert.alert(t("tickets.detail.statusError"), humanizeError(e));
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
			<View className="bg-background flex-1 justify-center">
				<EmptyState
					icon={LifeBuoy}
					title={t("tickets.goneTitle")}
					subtitle={t("tickets.goneSubtitle")}
				/>
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
				<AnimatedEntrance index={0} className="gap-3">
					<View className="flex-row items-start justify-between gap-2">
						<Text variant="h3" className="flex-1">
							{data.subject}
						</Text>
						<Animated.View
							key={data.status}
							entering={reduced ? undefined : FadeIn.duration(durations.base)}
						>
							<Badge variant={isOpen ? "gradient" : "secondary"}>
								{isOpen ? t("tickets.open") : t("tickets.closed")}
							</Badge>
						</Animated.View>
					</View>
					<Text variant="small" className="text-muted-foreground">
						{t("tickets.detail.meta", {
							category: t(`tickets.category.${data.category}`),
							priority: t(`tickets.priority.${data.priority}`),
						})}
					</Text>
				</AnimatedEntrance>

				<View className="gap-3 pt-2">
					{data.messages.map((m, i) => {
						const isNew = i >= initialCount.current;
						return (
							<AnimatedEntrance
								key={m.id}
								index={isNew ? 0 : i}
								preset={isNew ? "fadeUp" : "fadeDown"}
								className={
									m.isStaff ? "max-w-[85%] self-start" : "max-w-[85%] self-end"
								}
							>
								<GlowCard
									accent={m.isStaff ? "none" : "wash"}
									glow={m.isStaff}
									className="gap-1.5 p-3"
								>
									<View className="flex-row items-center justify-between gap-3">
										<Text variant="small" className="font-semibold">
											{m.isStaff
												? t("tickets.detail.support")
												: t("tickets.detail.you")}
										</Text>
										<Text variant="small" className="text-muted-foreground">
											{format(new Date(m.createdAt), "MMM d, h:mm a")}
										</Text>
									</View>
									<Text className="text-foreground leading-6">{m.body}</Text>
								</GlowCard>
							</AnimatedEntrance>
						);
					})}
				</View>

				<Button
					variant="outline"
					loading={statusBusy}
					onPress={() => setStatus(isOpen ? "closed" : "open")}
					accessibilityRole="button"
					accessibilityLabel={
						isOpen ? t("tickets.detail.close") : t("tickets.detail.reopen")
					}
					className="mt-2"
				>
					<Text>
						{isOpen ? t("tickets.detail.close") : t("tickets.detail.reopen")}
					</Text>
				</Button>
			</ScrollView>

			<View
				className="border-border bg-background flex-row items-end gap-2 border-t p-3"
				style={{ paddingBottom: insets.bottom + 12 }}
			>
				<Input
					placeholder={t("tickets.detail.replyPlaceholder")}
					value={reply}
					onChangeText={setReply}
					multiline
					className="max-h-28"
					containerClassName="flex-1"
					accessibilityLabel={t("tickets.detail.reply")}
				/>
				<Button
					size="icon"
					loading={sending}
					disabled={reply.trim().length === 0}
					onPress={send}
					accessibilityRole="button"
					accessibilityLabel={t("tickets.detail.sendReply")}
				>
					<Icon as={Send} size={18} className="text-primary-foreground" />
				</Button>
			</View>
		</KeyboardAvoidingView>
	);
}
