import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import type { RouterClient } from '@orpc/server';
import type { AppRouter } from '@backend/routes';
import { authClient } from '@/lib/auth-client';
import { env } from '@/lib/env';

// Headers must be a function so the better-auth cookie is read fresh on every
// request. credentials: 'omit' so the RN fetch layer doesn't clobber the
// manually-set Cookie header.
const link = new RPCLink({
  url: `${env.apiUrl}/api/rpc`,
  headers: () => {
    const cookie = authClient.getCookie();
    return cookie ? { Cookie: cookie } : {};
  },
  fetch: (url, init) => fetch(url, { ...init, credentials: 'omit' }),
});

export const client: RouterClient<AppRouter> = createORPCClient(link);
export const orpc = createTanstackQueryUtils(client);
