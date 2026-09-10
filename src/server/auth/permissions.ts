/**
 * Central RBAC permission checking.
 *
 * RULE (from the build order): "Build RBAC as a single permission check
 * function used everywhere. Never scatter role checks across components."
 *
 * Every route handler, server action, or page that needs to gate access
 * imports `requireRole` or `can` from here. If you ever write
 * `if (membership.role === "ADMIN")` anywhere outside this file, that's a
 * sign the check should be moved here instead.
 */

import { db } from "@/server/db";
import { Role } from "@prisma/client";

// Role hierarchy: higher roles inherit lower-role permissions.
const ROLE_RANK: Record<Role, number> = {
  MEMBER: 0,
  ADMIN: 1,
  OWNER: 2,
};

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotAMemberError extends Error {
  constructor() {
    super("You are not a member of this organization.");
    this.name = "NotAMemberError";
  }
}

/**
 * Fetches the caller's membership for a given org. This is the ONLY place
 * that should query the Membership table for authorization purposes —
 * everything else calls into this.
 */
export async function getMembership(userId: string, organizationId: string) {
  return db.membership.findUnique({
    where: {
      userId_organizationId: { userId, organizationId },
    },
  });
}

/**
 * Returns true/false — use when you want to conditionally render UI
 * rather than throw (e.g. hiding a "Delete org" button).
 */
export async function can(
  userId: string,
  organizationId: string,
  minimumRole: Role
): Promise<boolean> {
  const membership = await getMembership(userId, organizationId);
  if (!membership) return false;
  return ROLE_RANK[membership.role] >= ROLE_RANK[minimumRole];
}

/**
 * Throws if the caller doesn't have at least `minimumRole` in the org.
 * Use this at the top of every server action / API route that mutates
 * tenant data. This is the function that answers interview question #2:
 * "How do you guarantee a user in Org A can never read Org B's rows?"
 *
 * Answer: every mutation and every tenant-scoped query starts by calling
 * this, which both (a) confirms membership exists for THIS org, and
 * (b) confirms the role is sufficient. There is no code path that reads
 * tenant data without going through a query that includes organizationId,
 * and every organizationId used in a query is derived from a verified
 * membership row — never from a client-supplied value alone.
 */
export async function requireRole(
  userId: string,
  organizationId: string,
  minimumRole: Role
) {
  const membership = await getMembership(userId, organizationId);
  if (!membership) throw new NotAMemberError();
  if (ROLE_RANK[membership.role] < ROLE_RANK[minimumRole]) {
    throw new ForbiddenError();
  }
  return membership;
}

/**
 * Convenience wrapper: just confirm the caller belongs to the org at all,
 * regardless of role (e.g. viewing a shared dashboard).
 */
export async function requireMembership(userId: string, organizationId: string) {
  return requireRole(userId, organizationId, Role.MEMBER);
}
