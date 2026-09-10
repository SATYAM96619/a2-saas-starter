# A2 — Multi-Tenant SaaS Starter (Scaffold)

This is a **starter scaffold**, not a finished app. It implements the
hard, easy-to-get-wrong parts first, per the vault's build order:

1. ✅ Data model with tenancy baked in (`prisma/schema.prisma`)
2. ✅ Tenant-scoping DB guard (`src/server/db/index.ts`)
3. ✅ RBAC permission function (`src/server/auth/permissions.ts`)
4. ✅ Invite flow (`src/server/auth/invites.ts`)
5. ✅ Audit logging (`src/server/auth/audit.ts`)
6. ✅ Idempotent payment webhook handler (`src/app/api/webhooks/payments/route.ts`)
7. ✅ Plan/feature config (`src/lib/plans.ts`)
8. ✅ Usage metering with hard limits (`src/server/billing/usage.ts`)

## What's NOT here yet (you build this next)

- NextAuth configuration (`src/server/auth/config.ts` — wire up Google
  OAuth + credentials provider, connect the Prisma adapter)
- Frontend pages (org creation, invite acceptance UI, billing portal,
  usage dashboard)
- Actual Razorpay/Stripe SDK integration (the webhook handler is
  gateway-agnostic — verify against your chosen gateway's real payload
  shape and signature scheme)
- Tests for the webhook idempotency logic and tenant isolation
- Deployment config

## Suggested next steps (matching the vault's build order)

1. `npm install`, spin up local Postgres, `npm run db:migrate`
2. Wire up NextAuth — get a user able to sign up and log in
3. Build the "create organization" flow — this is where `Membership`
   rows with `role: OWNER` get created
4. Build the invite acceptance page that calls `acceptInvite()`
5. Pick Razorpay or Stripe, get their checkout flow working, then adapt
   `route.ts` to their actual webhook payload
6. Write a test that fires the same webhook event twice and asserts the
   subscription only changes once — this is your proof for interview
   question #1

See `SKILL.md` for the full skill file — fill in sections 4, 6, 7, 8 as
you go, not at the end.
