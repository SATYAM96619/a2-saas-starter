import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/server/db";
import { logAudit } from "@/server/auth/audit";
import { PlanTier, SubscriptionStatus } from "@prisma/client";

/**
 * Payment gateway webhook handler.
 *
 * This route answers interview question #1: "A payment webhook is
 * delivered three times. What exactly happens, and why does the user
 * only get charged once?"
 *
 * Answer, encoded below:
 *   1. Verify the signature first — never trust an unverified payload.
 *   2. Check ProcessedWebhookEvent for this event's ID BEFORE doing
 *      anything else. If it's already there, return 200 immediately
 *      without touching subscription state. This is what makes retries
 *      safe: gateways retry on anything other than a fast 2xx, so we
 *      must (a) respond fast and (b) be safe to call twice.
 *   3. Only after confirming it's new, write the event ID + apply the
 *      state change inside a single transaction, so a crash between
 *      "record event" and "update subscription" can't happen.
 */

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET!;

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  // Constant-time comparison — avoids timing attacks on the signature.
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}

type GatewayEvent = {
  id: string; // e.g. "evt_abc123" — unique per event, stable across retries
  type: string; // e.g. "subscription.activated", "subscription.payment_failed"
  data: {
    gatewayCustomerId: string;
    gatewaySubscriptionId: string;
    organizationId: string; // set via metadata when checkout session was created
    tier?: PlanTier;
    currentPeriodEnd?: string;
  };
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature");

  if (!verifySignature(rawBody, signature)) {
    // Do not leak *why* verification failed — just reject.
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as GatewayEvent;

  // --- Idempotency guard -------------------------------------------------
  const alreadyProcessed = await db.processedWebhookEvent.findUnique({
    where: { id: event.id },
  });
  if (alreadyProcessed) {
    // We've seen this event before. Ack it and stop — do NOT reapply
    // the state change. This is the line that prevents double-charging
    // side effects on retry.
    return NextResponse.json({ received: true, duplicate: true });
  }
  // ------------------------------------------------------------------------

  const { organizationId, gatewayCustomerId, gatewaySubscriptionId } = event.data;

  try {
    await db.$transaction(async (tx) => {
      // Record the event FIRST, inside the same transaction as the state
      // change. If either write fails, both roll back — so a crash never
      // leaves us in a state where the event is "processed" but the
      // subscription wasn't updated, or vice versa.
      await tx.processedWebhookEvent.create({
        data: { id: event.id, eventType: event.type },
      });

      switch (event.type) {
        case "subscription.activated": {
          await tx.subscription.upsert({
            where: { organizationId },
            create: {
              organizationId,
              tier: event.data.tier ?? PlanTier.PRO,
              status: SubscriptionStatus.ACTIVE,
              gatewayCustomerId,
              gatewaySubscriptionId,
              currentPeriodEnd: event.data.currentPeriodEnd
                ? new Date(event.data.currentPeriodEnd)
                : null,
            },
            update: {
              status: SubscriptionStatus.ACTIVE,
              tier: event.data.tier ?? PlanTier.PRO,
              gatewayCustomerId,
              gatewaySubscriptionId,
              currentPeriodEnd: event.data.currentPeriodEnd
                ? new Date(event.data.currentPeriodEnd)
                : null,
            },
          });
          break;
        }

        case "subscription.payment_failed": {
          await tx.subscription.update({
            where: { organizationId },
            data: { status: SubscriptionStatus.PAST_DUE },
          });
          break;
        }

        case "subscription.canceled": {
          await tx.subscription.update({
            where: { organizationId },
            data: { status: SubscriptionStatus.CANCELED, tier: PlanTier.FREE },
          });
          break;
        }

        default:
          // Unknown event type — we still record it as processed (so we
          // don't reprocess it), but there's no state change to apply.
          break;
      }
    });

    await logAudit({
      organizationId,
      action: `webhook.${event.type}`,
      metadata: { eventId: event.id },
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook processing failed:", err);
    // Returning 500 here is intentional: it tells the gateway to retry.
    // Because of the idempotency guard above, retrying is always safe.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
