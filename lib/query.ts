import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000,
			gcTime: 24 * 60 * 60 * 1000,
			retry: 2,
		},
	},
});

export const persister = createAsyncStoragePersister({
	storage: AsyncStorage,
	key: "headpat-cache-v2",
});
