import { PrismaClient } from "@prisma/client";

// Standard Next.js Prisma singleton pattern — avoids exhausting DB
// connections from hot-reloading in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Tenant-scoping guard.
 *
 * Build-order step 1: "Write a database helper that refuses any query
 * without an organization_id." This doesn't replace `requireRole` from
 * permissions.ts (that checks WHO can act); this is a defensive check
 * that WHAT they're querying is actually scoped to an org at all.
 *
 * Usage: wrap tenant-scoped query args with this so a missing
 * organizationId throws immediately instead of silently returning
 * cross-tenant data.
 *
 *   const orders = await db.order.findMany(
 *     scoped(organizationId, { where: { status: "PAID" } })
 *   );
 */
export function scoped<T extends { where?: Record<string, unknown> }>(
  organizationId: string | undefined | null,
  args: T
): T {
  if (!organizationId) {
    throw new Error(
      "Refusing to run a tenant query without an organizationId. " +
        "This is almost certainly a bug — every tenant-scoped query must " +
        "be explicitly scoped."
    );
  }
  return {
    ...args,
    where: {
      ...(args.where ?? {}),
      organizationId,
    },
  };
}
