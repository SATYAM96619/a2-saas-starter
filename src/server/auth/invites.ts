import crypto from "node:crypto";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/permissions";
import { logAudit } from "@/server/auth/audit";
import { Role } from "@prisma/client";

const INVITE_TTL_HOURS = 72;

function generateInviteToken() {
  // 32 bytes → 43-char base64url token. Long enough that it can't be
  // brute-forced, short enough to fit cleanly in a URL.
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Create an invite. Only ADMIN or OWNER may invite. This is the entry
 * point for build-order step 2 ("implement the invite + accept flow").
 */
export async function createInvite(params: {
  inviterUserId: string;
  organizationId: string;
  email: string;
  role: Role;
}) {
  const { inviterUserId, organizationId, email, role } = params;

  // Guard: only admins+ can invite, and never invite someone as an OWNER
  // via this path — ownership transfer should be its own explicit action.
  await requireRole(inviterUserId, organizationId, Role.ADMIN);
  if (role === Role.OWNER) {
    throw new Error("Use transferOwnership() to grant OWNER, not createInvite().");
  }

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

  const invite = await db.invite.create({
    data: {
      email: email.toLowerCase().trim(),
      role,
      token,
      organizationId,
      invitedById: inviterUserId,
      expiresAt,
    },
  });

  await logAudit({
    organizationId,
    userId: inviterUserId,
    action: "member.invited",
    metadata: { email, role },
  });

  // TODO: send the email via Resend, linking to /invite/accept?token=...
  return invite;
}

/**
 * Accept an invite. Validates the token hasn't expired or already been
 * used, then creates the Membership row.
 */
export async function acceptInvite(params: { token: string; userId: string }) {
  const { token, userId } = params;

  const invite = await db.invite.findUnique({ where: { token } });
  if (!invite) throw new Error("Invalid invite token.");
  if (invite.acceptedAt) throw new Error("This invite has already been used.");
  if (invite.expiresAt < new Date()) throw new Error("This invite has expired.");

  const [membership] = await db.$transaction([
    db.membership.upsert({
      where: {
        userId_organizationId: {
          userId,
          organizationId: invite.organizationId,
        },
      },
      create: {
        userId,
        organizationId: invite.organizationId,
        role: invite.role,
      },
      update: {}, // already a member — no-op, invite still gets marked accepted
    }),
    db.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  await logAudit({
    organizationId: invite.organizationId,
    userId,
    action: "member.joined",
    metadata: { via: "invite", inviteId: invite.id },
  });

  return membership;
}
