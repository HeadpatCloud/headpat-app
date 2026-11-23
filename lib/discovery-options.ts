import type { AdultLookingFor, LookingFor } from "@backend/lib/discovery";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

// Built-in copy of the API's discovery options. The API's answer wins once it
// arrives; this keeps the choices on screen when it can't be reached (or runs
// an older version without these routes) instead of showing an empty list.
const FALLBACK = {
	lookingFor: [
		"friends",
		"chat",
		"meetups",
		"gaming",
		"art",
		"roleplay",
		"dating",
	] satisfies LookingFor[],
	adultLookingFor: [
		"chat",
		"roleplay",
		"dating",
		"relationship",
		"fwb",
		"hookups",
	] satisfies AdultLookingFor[],
	maxInterests: 20,
	maxInto: 30,
	maxSonas: 20,
	maxSonaColors: 8,
	maxAdultPhotos: 12,
};

export function useDiscoveryOptions() {
	const q = useQuery({
		...orpc.discovery.options.queryOptions(),
		staleTime: 60 * 60 * 1000,
	});
	return q.data ?? FALLBACK;
}
