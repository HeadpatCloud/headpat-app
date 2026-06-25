import type { AppRouter } from "@backend/routes";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { Platform } from "react-native";
import { authClient } from "@/lib/auth-client";
import { env } from "@/lib/env";

const isWeb = Platform.OS === "web";

// Native: inject the better-auth session cookie from SecureStore on every
// request and omit credentials (so the RN fetch layer doesn't clobber it).
// Web: the browser owns cookies — never set Cookie manually (forbidden) and
// send credentials so the session cookie rides along.
const link = new RPCLink({
	url: `${env.apiUrl}/api/rpc`,
	headers: () => {
		if (isWeb) return {};
		const cookie = authClient.getCookie();
		return cookie ? { Cookie: cookie } : {};
	},
	fetch: (url, init) =>
		fetch(url, { ...init, credentials: isWeb ? "include" : "omit" }),
});

export const client: RouterClient<AppRouter> = createORPCClient(link);
export const orpc = createTanstackQueryUtils(client);
