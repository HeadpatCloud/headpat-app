import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

/**
 * Platform RBAC permissions of the signed-in user. `can("resource:action")`
 * mirrors the backend's wildcard semantics ("*:*", "resource:*").
 */
export function usePlatformPermissions() {
	const { data: session } = useSession();
	const query = useQuery({
		...orpc.adminRole.myPermissions.queryOptions(),
		enabled: !!session,
		staleTime: 5 * 60 * 1000,
	});
	const perms = query.data ?? [];
	const can = (required: string): boolean => {
		if (perms.includes("*:*") || perms.includes(required)) return true;
		return perms.includes(`${required.split(":")[0]}:*`);
	};
	return { can, perms };
}
