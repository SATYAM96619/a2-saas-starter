import { PlanTier } from "@prisma/client";

/**
 * Single source of truth for what each plan tier unlocks.
 *
 * Build-order step 4: "Define exactly what each tier unlocks in one
 * config file." Nowhere else in the codebase should hardcode a plan
 * limit — always import from here so upgrading a limit is a one-line
 * change instead of a grep-and-replace across the app.
 */
export const PLAN_LIMITS: Record<
  PlanTier,
  {
    label: string;
    maxSeats: number;
    maxApiCallsPerMonth: number;
    features: {
      auditLog: boolean;
      customDomains: boolean;
      prioritySupport: boolean;
    };
  }
> = {
  FREE: {
    label: "Free",
    maxSeats: 3,
    maxApiCallsPerMonth: 1_000,
    features: { auditLog: false, customDomains: false, prioritySupport: false },
  },
  PRO: {
    label: "Pro",
    maxSeats: 10,
    maxApiCallsPerMonth: 50_000,
    features: { auditLog: true, customDomains: false, prioritySupport: false },
  },
  TEAM: {
    label: "Team",
    maxSeats: 50,
    maxApiCallsPerMonth: 250_000,
    features: { auditLog: true, customDomains: true, prioritySupport: true },
  },
};

export function hasFeature(
  tier: PlanTier,
  feature: keyof (typeof PLAN_LIMITS)["FREE"]["features"]
): boolean {
  return PLAN_LIMITS[tier].features[feature];
}
