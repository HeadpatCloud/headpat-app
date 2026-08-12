import { type Href, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Alert, Linking } from "react-native";
import { appRoute, webPath } from "@/lib/app-route";
import { useI18n } from "@/lib/i18n/provider";
import { humanizeError } from "@/lib/orpc-error";

/**
 * Opens a link the way a link should open: Headpat's own URLs jump to the
 * matching screen, everything else (and Headpat pages the app doesn't have)
 * goes to the browser.
 */
export function useOpenLink() {
	const { t } = useI18n();

	return async (url: string) => {
		if (!url) return;
		const path = webPath(url);
		const route = path ? appRoute(path) : null;
		if (route) {
			// mapped from a runtime URL, so it can't satisfy the static Href union
			router.push(route as Href);
			return;
		}
		try {
			if (/^https?:\/\//i.test(url)) await WebBrowser.openBrowserAsync(url);
			else await Linking.openURL(url);
		} catch (e) {
			Alert.alert(t("common.linkFailed"), humanizeError(e));
		}
	};
}
