export type LngLat = [number, number];

/** Closed ring approximating a circle, for GeoJSON polygons on the map. */
export function circleRing(
	center: LngLat,
	radiusMeters: number,
	steps = 64,
): LngLat[] {
	const [lng, lat] = center;
	const dLat = radiusMeters / 111_320;
	const dLng = radiusMeters / (111_320 * Math.cos((lat * Math.PI) / 180));
	const ring: LngLat[] = [];
	for (let i = 0; i <= steps; i++) {
		const theta = (i / steps) * 2 * Math.PI;
		ring.push([lng + dLng * Math.cos(theta), lat + dLat * Math.sin(theta)]);
	}
	return ring;
}
