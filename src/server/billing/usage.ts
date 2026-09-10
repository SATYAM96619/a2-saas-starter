import { db } from "@/server/db";
import { PLAN_LIMITS } from "@/lib/plans";
import { PlanTier } from "@prisma/client";

export class UsageLimitExceededError extends Error {
  constructor(metric: string, limit: number) {
    super(`Usage limit exceeded for "${metric}" (limit: ${limit}).`);
    this.name = "UsageLimitExceededError";
  }
}

function currentPeriod() {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { periodStart, periodEnd };
}

/**
 * Increment a metered action (e.g. an API call). Blocks with
 * UsageLimitExceededError if the org's hard limit for the current
 * billing period has been reached — call this BEFORE performing the
 * metered action, not after, so you never let something through that
 * you can't actually count.
 */
export async function incrementUsage(params: {
  organizationId: string;
  metric: "api_calls" | "seats" | "storage_mb";
}) {
  const { organizationId, metric } = params;
  const { periodStart, periodEnd } = currentPeriod();

  const subscription = await db.subscription.findUnique({
    where: { organizationId },
  });
  const tier = subscription?.tier ?? PlanTier.FREE;
  const limit =
    metric === "api_calls" ? PLAN_LIMITS[tier].maxApiCallsPerMonth : Infinity;

  const record = await db.usageRecord.upsert({
    where: {
      organizationId_metric_periodStart: { organizationId, metric, periodStart },
    },
    create: { organizationId, metric, periodStart, periodEnd, count: 0 },
    update: {},
  });

  if (record.count >= limit) {
    throw new UsageLimitExceededError(metric, limit);
  }

  return db.usageRecord.update({
    where: { id: record.id },
    data: { count: { increment: 1 } },
  });
}

/** For the in-app usage dashboard: how much of this period's quota is used. */
export async function getUsageSummary(organizationId: string) {
  const { periodStart } = currentPeriod();
  const subscription = await db.subscription.findUnique({
    where: { organizationId },
  });
  const tier = subscription?.tier ?? PlanTier.FREE;

  const records = await db.usageRecord.findMany({
    where: { organizationId, periodStart },
  });

  return {
    tier,
    limits: PLAN_LIMITS[tier],
    usage: Object.fromEntries(records.map((r) => [r.metric, r.count])),
  };
}
