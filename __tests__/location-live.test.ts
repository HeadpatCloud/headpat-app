import {
	applyLocationEvent,
	type LiveState,
} from "@/lib/location/live-locations";

const A = {
	userId: "a",
	lat: 1,
	lng: 2,
	statusText: null,
	statusColor: null,
	updatedAt: "t1",
};

describe("applyLocationEvent", () => {
	it("seed replaces the whole map", () => {
		const s = applyLocationEvent({}, { type: "seed", items: [A] });
		expect(s).toEqual({ a: A });
	});
	it("location adds/updates one sharer", () => {
		const s = applyLocationEvent(
			{},
			{ type: "location", userId: "a", location: { lat: 1, lng: 2 } },
		);
		expect(s.a.lat).toBe(1);
		const s2 = applyLocationEvent(s, {
			type: "location",
			userId: "a",
			location: { lat: 9, lng: 9 },
		});
		expect(s2.a.lat).toBe(9);
	});
	it("partial location delta keeps the canonical userId and prior fields", () => {
		const s: LiveState = { a: A };
		const s2 = applyLocationEvent(s, {
			type: "location",
			userId: "a",
			location: { lat: 9, lng: 9 },
		});
		expect(s2.a.userId).toBe("a");
		expect(s2.a.statusText).toBeNull();
		expect(s2.a.updatedAt).toBe("t1");
		expect(s2.a.lat).toBe(9);
	});
	it("location-share-ended removes a sharer", () => {
		const s: LiveState = { a: A };
		expect(
			applyLocationEvent(s, { type: "location-share-ended", userId: "a" }),
		).toEqual({});
	});
});
