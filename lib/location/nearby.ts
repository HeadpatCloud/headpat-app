import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { kvGet, kvSet } from "@/lib/db/kv";
import { client, orpc } from "@/lib/orpc";
import { circleRing, type LngLat } from "./geo";

// How often the map refetches who's around and, while you are visible,
// refreshes your own cell. Cells are 1 to 5 km wide, so minutes are plenty.
export const NEARBY_REFRESH_MS = 2 * 60 * 1000;

const SHOW_KEY = "hp-show-nearby";

export type NearbyPerson = {
	userId: string;
	profileUrl: string | null;
	displayName: string | null;
	name: string | null;
	avatarFileId: string | null;
	precision: "precise" | "rough";
	eventId: string | null;
	eventTitle: string | null;
	lat: number;
	lng: number;
	cellKm: number;
	distanceKm: number | null;
	updatedAt: Date | string;
};

/** Per-device switch for the "who's around" layer. Viewing is harmless, so on
 *  by default; being visible is the opt-in, and lives on the server. */
export function useShowNearby() {
	const [show, setShow] = useState(() => kvGet(SHOW_KEY) !== "false");
	return {
		show,
		setShow: (v: boolean) => {
			setShow(v);
			kvSet(SHOW_KEY, v ? "true" : "false");
		},
	};
}

export const nearbyQueries = {
	status: () => orpc.nearby.status.queryOptions({ input: {} }),
	list: () => orpc.nearby.list.queryOptions({ input: {} }),
	events: () => orpc.nearby.events.queryOptions({ input: {} }),
};

export function useInvalidateNearby() {
	const qc = useQueryClient();
	return () =>
		Promise.all([
			qc.invalidateQueries({ queryKey: orpc.nearby.status.key() }),
			qc.invalidateQueries({ queryKey: orpc.nearby.list.key() }),
		]);
}

/** One position fix for the API, which snaps it to a grid cell before storing
 *  anything. Last known first: a fresh fix can hang indoors. Null when location
 *  access is off or no fix is available. */
export async function nearbyFix(
	ask: boolean,
): Promise<{ lat: number; lng: number } | null> {
	const perm = ask
		? await Location.requestForegroundPermissionsAsync().catch(() => null)
		: await Location.getForegroundPermissionsAsync().catch(() => null);
	if (!perm?.granted) return null;
	const pos =
		(await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 }).catch(
			() => null,
		)) ??
		(await Location.getCurrentPositionAsync({
			accuracy: Location.Accuracy.Balanced,
		}).catch(() => null));
	return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null;
}

/** While the map is open and you are visible, keep your cell fresh, and again
 *  whenever the app comes back to the foreground. Silent on failure: the last
 *  cell simply stays until it goes stale or expires. */
export function useRefreshOwnCell(visible: boolean) {
	useEffect(() => {
		if (!visible) return;
		let cancelled = false;
		const tick = () => {
			nearbyFix(false)
				.then((pos) => {
					if (pos && !cancelled) return client.nearby.updatePosition(pos);
				})
				.catch(() => {});
		};
		tick();
		const id = setInterval(tick, NEARBY_REFRESH_MS);
		const sub = AppState.addEventListener("change", (s) => {
			if (s === "active") tick();
		});
		return () => {
			cancelled = true;
			clearInterval(id);
			sub.remove();
		};
	}, [visible]);
}

export function useNearby(enabled: boolean) {
	const status = useQuery(nearbyQueries.status());
	useRefreshOwnCell(status.data?.visible === true);
	const list = useQuery({
		...nearbyQueries.list(),
		enabled,
		refetchInterval: NEARBY_REFRESH_MS,
	});
	return { status, people: enabled ? (list.data ?? []) : [] };
}

/** Everyone in one cell shares a point. Spread them on a small ring inside the
 *  cell so each can be tapped; the offset is cosmetic and stays in the cell. */
export function spreadInCells(
	people: NearbyPerson[],
): { person: NearbyPerson; at: LngLat }[] {
	const byCell = new Map<string, NearbyPerson[]>();
	for (const p of people) {
		const key = `${p.lat},${p.lng}`;
		byCell.set(key, [...(byCell.get(key) ?? []), p]);
	}
	const out: { person: NearbyPerson; at: LngLat }[] = [];
	for (const group of byCell.values()) {
		group.sort((a, b) => a.userId.localeCompare(b.userId));
		if (group.length === 1) {
			out.push({ person: group[0], at: [group[0].lng, group[0].lat] });
			continue;
		}
		const first = group[0];
		const ring = circleRing(
			[first.lng, first.lat],
			first.cellKm * 1000 * 0.15,
			group.length,
		);
		for (const [i, person] of group.entries())
			out.push({ person, at: ring[i] });
	}
	return out;
}

/** The faint circle per occupied cell, so nobody reads a pin as precise. */
export function useNearbyCells(
	people: NearbyPerson[],
): GeoJSON.FeatureCollection {
	return useMemo(() => {
		const seen = new Set<string>();
		const features: GeoJSON.Feature[] = [];
		for (const p of people) {
			const key = `${p.lat},${p.lng}`;
			if (seen.has(key)) continue;
			seen.add(key);
			features.push({
				type: "Feature",
				geometry: {
					type: "Polygon",
					coordinates: [circleRing([p.lng, p.lat], (p.cellKm * 1000) / 2)],
				},
				properties: { cell: key },
			});
		}
		return { type: "FeatureCollection", features };
	}, [people]);
}
