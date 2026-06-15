import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

// Resolve a share target's display name. Users come from their profile,
// communities from the community record. Falls back to the raw id while loading
// or if the lookup fails.
export function useTargetName(
	targetType: "user" | "community",
	targetId: string,
): string {
	const isUser = targetType === "user";
	const profile = useQuery({
		...orpc.profile.byId.queryOptions({ input: { userId: targetId } }),
		enabled: isUser && !!targetId,
	});
	const community = useQuery({
		...orpc.community.byId.queryOptions({ input: { communityId: targetId } }),
		enabled: !isUser && !!targetId,
	});
	if (isUser) {
		return profile.data?.displayName ?? profile.data?.profileUrl ?? targetId;
	}
	return community.data?.name ?? targetId;
}
