import { useCallback, useEffect, useState } from "react";

export type LiveLocation = {
	userId: string;
	lat: number;
	lng: number;
	accuracy?: number | null;
	heading?: number | null;
	speed?: number | null;
	statusText?: string | null;
	statusColor?: string | null;
	updatedAt?: string;
};

export type LiveState = Record<string, LiveLocation>;

export type LiveEvent =
	| { type: "seed"; items: LiveLocation[] }
	| {
			type: "location";
			userId: string;
			location: Partial<LiveLocation> & { lat: number; lng: number };
	  }
	| { type: "location-share-ended"; userId: string };

// Pure: fold a websocket/seed event into the {userId -> location} map.
export function applyLocationEvent(
	state: LiveState,
	evt: LiveEvent,
): LiveState {
	switch (evt.type) {
		case "seed":
			return Object.fromEntries(evt.items.map((i) => [i.userId, i]));
		case "location":
			return {
				...state,
				[evt.userId]: {
					...state[evt.userId],
					userId: evt.userId,
					...evt.location,
				},
			};
		case "location-share-ended": {
			if (!state[evt.userId]) return state;
			const next = { ...state };
			delete next[evt.userId];
			return next;
		}
	}
}

// Store hook used by the map: seeds from `seed`, applies live deltas via `dispatch`.
export function useLiveLocations(seed: LiveLocation[]) {
	const [state, setState] = useState<LiveState>({});
	useEffect(() => {
		setState(applyLocationEvent({}, { type: "seed", items: seed }));
	}, [seed]);
	// Stable identity matters: the map screen feeds this into a WebSocket effect's
	// dependency list, so a fresh closure per render tore down and reopened the
	// socket on every render, dropping live events across the gap.
	const dispatch = useCallback(
		(evt: LiveEvent) => setState((s) => applyLocationEvent(s, evt)),
		[],
	);
	return { locations: Object.values(state), dispatch };
}
