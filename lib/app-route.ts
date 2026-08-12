// Web links (headpat.place and friends) and backend notification links are
// web-style paths; map them onto app routes and drop the ones that have no
// screen yet (e.g. /chat), so callers never navigate to a non-existent route
// and can fall back to a browser instead.

const INTERNAL_HOSTS = new Set(["headpat.place", "headpat.app"]);

// Web URLs may carry a locale prefix (/de/user/x); app routes never do.
// Mirrors the locales the web app serves.
const LOCALE_PREFIXES = new Set(["en", "de", "nl"]);

const EXACT: Record<string, string> = {
	"/": "/",
	"/account": "/profile-edit",
	"/account/tickets": "/tickets",
	"/admin": "/admin",
	"/admin/reports": "/admin/reports",
	"/admin/tickets": "/admin/tickets",
	"/announcements": "/announcements",
	"/changelog": "/changelog",
	"/community": "/community",
	"/community/new": "/community/new",
	"/events": "/(tabs)/events",
	"/events/new": "/events/new",
	"/forgot-password": "/(auth)/forgot-password",
	"/gallery": "/(tabs)/gallery",
	"/gallery/upload": "/gallery/upload",
	"/legal": "/legal",
	"/login": "/(auth)/login",
	"/map": "/(tabs)/locations",
	"/notifications": "/notifications",
	"/profile": "/profile",
	"/register": "/(auth)/register",
	"/support": "/support",
	"/users": "/users",
};

/**
 * The path of a URL that belongs to Headpat itself, with any locale prefix
 * stripped. Returns null for anything hosted elsewhere.
 */
export function webPath(url: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}
	const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
	if (!INTERNAL_HOSTS.has(host)) return null;
	return parsed.pathname || "/";
}

export function appRoute(link: string | null): string | null {
	if (!link) return null;
	const segments = link.split("?")[0].split("#")[0].split("/").filter(Boolean);
	if (LOCALE_PREFIXES.has(segments[0])) segments.shift();

	const exact = EXACT[`/${segments.join("/")}`];
	if (exact) return exact;

	const [head, id, tail] = segments;
	if (segments.length === 2) {
		if (head === "user") return `/user/${id}`;
		if (head === "events") return `/event/${id}`;
		if (head === "gallery") return `/post/${id}`;
		if (head === "community") return `/community/${id}`;
		if (head === "announcements") return `/announcements/${id}`;
	}
	if (segments.length === 3) {
		if (head === "user" && (tail === "followers" || tail === "following")) {
			return `/user/${id}/${tail}`;
		}
		if (head === "events" && tail === "edit") return `/event/edit/${id}`;
		if (head === "community" && tail === "admin")
			return `/community-admin/${id}`;
		if (head === "admin" && id === "tickets") return `/tickets/${tail}`;
	}
	return null;
}
