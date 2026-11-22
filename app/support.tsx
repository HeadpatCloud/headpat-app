import { type Href, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Alert, Linking, ScrollView, View } from "react-native";
import { ArrowRight, MessageSquarePlus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PageTitle } from "@/components/ui/page-title";
import { SectionCard } from "@/components/ui/section-card";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/provider";
import { humanizeError } from "@/lib/orpc-error";

type Contact = {
	label: string;
	descKey: string;
	linkText: string;
	url: string;
	// Web pages open in the in-app browser; mailto/discord go to their apps.
	inApp?: boolean;
};

const CONTACTS: Contact[] = [
	{
		label: "Discord",
		descKey: "support.discordDesc",
		linkText: "discord.gg/EaQTEKRg2A",
		url: "https://discord.com/invite/EaQTEKRg2A",
	},
	{
		label: "support.emailLabel",
		descKey: "support.emailDesc",
		linkText: "help@headpat.place",
		url: "mailto:help@headpat.place",
	},
	{
		label: "GitHub",
		descKey: "support.githubDesc",
		linkText: "github.com/headpatcloud",
		url: "https://github.com/headpatcloud",
		inApp: true,
	},
];

// The website's Help & support page: tickets and the other contact options on
// one screen (the app used to have separate, look-alike Support and Tickets).
export default function Support() {
	const { t } = useI18n();
	const { data: session } = useSession();

	const go = (href: Href) =>
		router.push(session ? href : ("/(auth)/login" as Href));

	async function open(contact: Contact) {
		try {
			if (contact.inApp) await WebBrowser.openBrowserAsync(contact.url);
			else await Linking.openURL(contact.url);
		} catch (e) {
			Alert.alert(t("common.linkFailed"), humanizeError(e));
		}
	}

	return (
		<ScrollView
			className="bg-background flex-1"
			contentContainerClassName="gap-4 px-4 pb-8"
		>
			<PageTitle title={t("support.title")} subtitle={t("support.subtitle")} />

			<View className="bg-primary/10 border-primary/30 gap-3 rounded-3xl border p-5">
				<View className="flex-row items-center gap-2.5">
					<Icon as={MessageSquarePlus} size={20} className="text-link" />
					<Text className="font-display flex-1 text-lg font-semibold">
						{t("support.openTicket")}
					</Text>
				</View>
				<Text className="text-muted-foreground font-semibold">
					{t("support.ticketDesc")}
				</Text>
				<View className="flex-row flex-wrap gap-2.5 pt-1">
					<Button
						variant="outline"
						size="sm"
						onPress={() => go("/tickets")}
						className="bg-card"
					>
						<Text>{t("support.yourTickets")}</Text>
					</Button>
					<Button size="sm" onPress={() => go("/tickets/new")}>
						<Text>{t("support.newTicket")}</Text>
						<Icon
							as={ArrowRight}
							size={16}
							className="text-primary-foreground"
						/>
					</Button>
				</View>
			</View>

			<SectionCard title={t("support.otherWays")}>
				{CONTACTS.map((c) => (
					<View key={c.url} className="gap-0.5">
						<Text className="font-bold">
							{c.label.startsWith("support.") ? t(c.label) : c.label}
						</Text>
						<Text className="text-muted-foreground">
							{t(c.descKey)}{" "}
							<Text
								onPress={() => open(c)}
								accessibilityRole="link"
								className="text-link font-semibold"
							>
								{c.linkText}
							</Text>
						</Text>
					</View>
				))}
			</SectionCard>
		</ScrollView>
	);
}
