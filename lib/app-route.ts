// Backend notification links are web-style paths; map them onto app routes and
// drop the ones that have no screen yet (e.g. /messages). Returns null for
// anything unrecognized so callers never navigate to a non-existent route.
export function appRoute(link: string | null): string | null {
	if (!link) return null;
	if (link === "/account/tickets") return "/tickets";
	if (/^\/(user|gallery|events|community|announcements)\//.test(link))
		return link;
	return null;
}
