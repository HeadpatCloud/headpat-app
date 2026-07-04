export function redirectSystemPath({
	path,
}: {
	path: string;
	initial: boolean;
}) {
	if (path.startsWith("/events/")) {
		const rest = path.slice("/events/".length);
		if (rest && rest !== "new" && !rest.startsWith("edit/")) {
			return `/event/${rest}`;
		}
	}
	if (path.startsWith("/gallery/")) {
		const rest = path.slice("/gallery/".length);
		if (rest && rest !== "upload" && !rest.startsWith("edit/")) {
			return `/post/${rest}`;
		}
	}
	return path;
}
