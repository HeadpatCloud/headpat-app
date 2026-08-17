import { QueryClient } from "@tanstack/query-core";
import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

// Guards the sign-out path: clearCollections runs before signOut, so anything it
// throws leaves the user signed in with no visible feedback.
describe("clearing a query collection whose sync never started", () => {
	const makeCollection = () =>
		createCollection(
			queryCollectionOptions<{ id: string }>({
				id: "gallery-recent",
				queryKey: ["db", "gallery", "recent"],
				queryClient: new QueryClient(),
				queryFn: async () => [],
				getKey: (item) => item.id,
			}),
		);

	it("throws when writeDelete is called unconditionally", () => {
		const collection = makeCollection();
		expect(collection.status).toBe("idle");
		expect(() =>
			collection.utils.writeDelete([...collection.keys()]),
		).toThrow();
	});

	it("is a no-op when the write is skipped for an empty key set", () => {
		const collection = makeCollection();
		const keys = [...collection.keys()];
		expect(keys).toEqual([]);
		expect(() => {
			if (keys.length) collection.utils.writeDelete(keys);
		}).not.toThrow();
	});
});
