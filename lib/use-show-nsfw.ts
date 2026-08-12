import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

const KEY = "hp-show-nsfw";

/**
 * Per-device "show NSFW" switch, mirroring the web. Only meaningful when the
 * account allows NSFW at all — the API already withholds those items otherwise,
 * so `nsfwAllowed` decides whether the switch is worth showing.
 */
export function useShowNsfw() {
	const { data: session } = useSession();
	const me = useQuery({
		...orpc.profile.me.queryOptions({ input: {} }),
		enabled: !!session,
	});
	const [showNsfw, setShow] = useState(true);

	useEffect(() => {
		AsyncStorage.getItem(KEY).then((value) => setShow(value !== "false"));
	}, []);

	return {
		nsfwAllowed: !!me.data?.nsfwEnabled,
		showNsfw,
		setShowNsfw: (value: boolean) => {
			setShow(value);
			AsyncStorage.setItem(KEY, String(value));
		},
	};
}
