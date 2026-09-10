import { db } from "@/server/db";

/**
 * Every sensitive action (invite, role change, plan change, deletion)
 * should call this. Keep the `action` string a stable, dot-namespaced
 * identifier (e.g. "member.invited", "role.changed", "plan.upgraded")
 * so the audit log is filterable/greppable later.
 */
export async function logAudit(params: {
  organizationId: string;
  userId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  const { organizationId, userId, action, metadata } = params;

  return db.auditLog.create({
    data: {
      organizationId,
      userId: userId ?? null,
      action,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
    },
  });
}
