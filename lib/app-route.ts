// Backend notification links are web-style paths; map them onto app routes and
// drop the ones that have no screen yet (e.g. /messages). Returns null for
// anything unrecognized so callers never navigate to a non-existent route.
export function appRoute(link: string | null): string | null {
	if (!link) return null;
	if (link === "/account/tickets") return "/tickets";
	if (link.startsWith("/events/")) return link.replace("/events/", "/event/");
	if (link.startsWith("/gallery/")) return link.replace("/gallery/", "/post/");
	if (/^\/(user|community|announcements)\//.test(link)) return link;
	return null;
}
