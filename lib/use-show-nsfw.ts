import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { kvGet, kvSet } from "@/lib/db/kv";
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
	const [showNsfw, setShow] = useState(() => kvGet(KEY) !== "false");

	// `enabled` only stops the fetch; it does not drop already-cached data, and
	// profile.me is persisted on purpose. Without the session check a signed-out
	// user rehydrates someone's nsfwEnabled and gets the toggle.
	const nsfwAllowed = !!session && !!me.data?.nsfwEnabled;

	return {
		nsfwAllowed,
		// Never report "show" when it isn't allowed: the API withholds NSFW from
		// guests, but the persisted collections can still hold rows fetched while
		// signed in, and this flag is what filters them.
		showNsfw: nsfwAllowed && showNsfw,
		setShowNsfw: (value: boolean) => {
			setShow(value);
			kvSet(KEY, String(value));
		},
	};
}
