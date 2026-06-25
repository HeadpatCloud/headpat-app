export function humanizeError(error: unknown): string {
	if (error instanceof TypeError && /network/i.test(error.message)) {
		return "Can't reach the server. Check your connection.";
	}
	if (error && typeof error === "object" && "message" in error) {
		const m = (error as { message?: unknown }).message;
		if (typeof m === "string" && m.length > 0) return m;
	}
	return "Something went wrong. Please try again.";
}
