---
project: A2 Multi-Tenant SaaS Starter with Subscriptions
track: full-stack
level: intermediate
started: <FILL IN TODAY'S DATE>
shipped:
repo: <FILL IN GITHUB URL ONCE CREATED>
live:
---

# 1. What this project is
<Two sentences. Explain it to a non-technical friend, then to an engineer.>

# 2. Problem it solves
<Why would anyone run this? If the honest answer is "it was a tutorial",
 change the project until there is a real answer.>

# 3. Architecture

Components (fill in as you build; this is the intended shape from the scaffold):
- Next.js App Router → frontend + API routes → chosen for one deployable unit and built-in API route handlers
- PostgreSQL + Prisma → relational data, tenant isolation via organizationId columns → chosen over NoSQL because RBAC/billing data is inherently relational and needs transactions
- NextAuth → auth/session management → chosen over rolling custom JWT auth for battle-tested OAuth + credentials support
- Razorpay/Stripe webhooks → billing state changes → chosen because client-side confirmation cannot be trusted
- Resend → transactional email → chosen for invite/receipt/failure emails

# 4. Key decisions and trade-offs
| Decision | Options I considered | What I chose | Why | What I gave up |
|---|---|---|---|---|
| Tenant isolation strategy | Separate DB per tenant, separate schema per tenant, shared schema with organizationId column | Shared schema + organizationId | Simplicity at this scale; easier migrations | Slightly weaker isolation guarantee than DB-per-tenant; must be disciplined about the `scoped()` helper |
| Idempotency mechanism | Idempotency keys on request, dedupe table on event ID | Dedupe table (ProcessedWebhookEvent) | Gateway sends a stable event ID already; no need to invent our own key | N/A yet — fill in if you hit a real trade-off here |
| | | | | |

# 5. Skills demonstrated
- [ ] Multi-tenant architecture and data isolation — evidence: `src/server/db/index.ts` `scoped()` helper, `organizationId` on every tenant table in `prisma/schema.prisma`
- [ ] Role-based access control design — evidence: `src/server/auth/permissions.ts`
- [ ] Payment gateway integration and webhook security — evidence: `src/app/api/webhooks/payments/route.ts`
- [ ] Idempotency and exactly-once handling of retried events — evidence: `ProcessedWebhookEvent` table + transaction in webhook handler
- [ ] Feature flagging and usage metering — evidence: `src/lib/plans.ts`, `src/server/billing/usage.ts`
- [ ] TypeScript end-to-end type safety with Prisma — evidence: <fill in once frontend forms are built>

# 6. Numbers I measured
| Metric | Before | After | How I measured it |
|---|---|---|---|
| | | | |

# 7. Things that broke and how I fixed them
1. Symptom:
   Cause:
   Fix:
   Lesson:

# 8. What I would do differently at 100x scale
<Three bullets.>

# 9. Interview answers I have rehearsed
Q: A payment webhook is delivered three times. What exactly happens in your system, and why does the user only get charged once?
A: <Write this in your own words after you've built and tested it — the code comments in the webhook route explain the mechanism, but rehearse explaining it without looking at the code.>

Q: How do you guarantee that a user in Org A can never read Org B's rows? Show me the code path.
A:

Q: A customer downgrades mid-cycle. Walk me through every record that changes.
A:

# 10. Honest limitations
<What this scaffold does NOT do yet: no frontend UI built, no actual
 payment gateway SDK wired up (webhook handler expects a generic shape
 you'll need to adapt to Razorpay's or Stripe's actual event schema),
 no tests written yet, ownership transfer not implemented.>

# 11. How to run it
```bash
git clone <repo> && cd <repo>
cp .env.example .env # fill in the values listed below
npm install
npm run db:migrate
npm run dev
# open http://localhost:3000
```

Required environment variables: see `.env.example`

# 12. Credits
Scaffold structure and build order based on "The Resume Project Vault 2026"
by @pratham.codes. Reference resources studied: roadmap.sh, Awesome
Scalability (github.com/binhnguyennus/awesome-scalability), Project-Based
Learning (github.com/practical-tutorials/project-based-learning).
