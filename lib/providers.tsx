import { defaultShouldDehydrateQuery } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import { persister, queryClient } from "@/lib/query";

export function AppProviders({ children }: { children: ReactNode }) {
	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{
				persister,
				dehydrateOptions: {
					// Presigned storage URLs expire in minutes — persisting them just
					// bloats the startup restore and hydrates dead URLs.
					shouldDehydrateQuery: (query) =>
						defaultShouldDehydrateQuery(query) &&
						!(
							Array.isArray(query.queryKey[0]) &&
							query.queryKey[0][0] === "storage"
						),
				},
			}}
		>
			{children}
		</PersistQueryClientProvider>
	);
}
