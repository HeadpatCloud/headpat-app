import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { useSession } from "@/lib/auth-client";
import { client, orpc } from "@/lib/orpc";
import { humanizeError } from "@/lib/orpc-error";

// "Blur 18+ pictures" follows the account, on unless turned off. Signed-out
// people never see 18+ content, so they just get the default.
export function useBlurAdult(): boolean {
	const { data: session } = useSession();
	const mine = useQuery({
		...orpc.discovery.mine.queryOptions({ input: {} }),
		enabled: !!session,
	});
	return mine.data?.blurAdult ?? true;
}

export function useSetBlurAdult() {
	const qc = useQueryClient();
	const key = orpc.discovery.mine.queryKey({ input: {} });
	return async (blurAdult: boolean) => {
		type Mine = Awaited<ReturnType<typeof client.discovery.mine>>;
		const before = qc.getQueryData<Mine>(key);
		// flip right away; the switch shouldn't wait for the round trip
		if (before) qc.setQueryData<Mine>(key, { ...before, blurAdult });
		try {
			await client.discovery.setBlurAdult({ blurAdult });
		} catch (e) {
			if (before) qc.setQueryData<Mine>(key, before);
			Alert.alert("", humanizeError(e));
		}
	};
}
