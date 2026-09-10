"use server";

import { db } from "@/server/db";
import { logAudit } from "@/server/auth/audit";
import { Role, PlanTier, SubscriptionStatus } from "@prisma/client";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createOrganization(params: { userId: string; name: string }) {
  const { userId, name } = params;

  const baseSlug = slugify(name);
  if (!baseSlug) throw new Error("Organization name must contain at least one letter or number.");

  let slug = baseSlug;
  let suffix = 0;
  while (await db.organization.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const org = await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name, slug },
    });

    await tx.membership.create({
      data: {
        userId,
        organizationId: organization.id,
        role: Role.OWNER,
      },
    });

    await tx.subscription.create({
      data: {
        organizationId: organization.id,
        tier: PlanTier.FREE,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    return organization;
  });

  await logAudit({
    organizationId: org.id,
    userId,
    action: "organization.created",
    metadata: { name, slug },
  });

  return org;
}

export async function getUserOrganizations(userId: string) {
  const memberships = await db.membership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((m) => ({
    organization: m.organization,
    role: m.role,
  }));
}
