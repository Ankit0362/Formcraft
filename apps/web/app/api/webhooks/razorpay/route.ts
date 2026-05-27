import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@repo/database";
import { workspacesTable } from "@repo/database/models/workspace";
import { eq } from "drizzle-orm";

// FIX #3: Only allow known tier values from webhook notes
const VALID_TIERS = ["free", "pro", "business", "enterprise"] as const;
type ValidTier = (typeof VALID_TIERS)[number];

function isValidTier(value: unknown): value is ValidTier {
  return typeof value === "string" && (VALID_TIERS as readonly string[]).includes(value);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error("Missing RAZORPAY_WEBHOOK_SECRET");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const subscription = event.payload?.subscription?.entity;

    if (!subscription) {
      // Not an event we care about, but acknowledge receipt
      return NextResponse.json({ received: true });
    }

    const workspaceId = subscription.notes?.workspaceId;

    // Handle subscription charge successful → upgrade tier
    if (event.event === "subscription.charged") {
      const rawTier = subscription.notes?.tier;

      // FIX #3: Strictly validate tier against allowed list
      if (!workspaceId || typeof workspaceId !== "string") {
        console.error("Webhook: missing or invalid workspaceId in notes", subscription.notes);
        return NextResponse.json({ received: true }); // Acknowledge but don't process
      }

      if (!isValidTier(rawTier)) {
        console.error(`Webhook: invalid tier value "${rawTier}" rejected`);
        return NextResponse.json({ received: true }); // Acknowledge but don't process
      }

      // Only allow upgrading to paid tiers via webhook, not downgrading to free
      if (rawTier === "free") {
        console.warn("Webhook: attempted to set tier to 'free' via subscription.charged — ignored");
        return NextResponse.json({ received: true });
      }

      await db
        .update(workspacesTable)
        .set({ tier: rawTier })
        .where(eq(workspacesTable.id, workspaceId));

      console.log(`Webhook: upgraded workspace ${workspaceId} to tier ${rawTier}`);
    }

    // Handle subscription cancellation or halt → downgrade to free
    if (event.event === "subscription.cancelled" || event.event === "subscription.halted") {
      if (!workspaceId || typeof workspaceId !== "string") {
        console.error("Webhook: missing workspaceId for cancellation event");
        return NextResponse.json({ received: true });
      }

      await db
        .update(workspacesTable)
        .set({ tier: "free", razorpaySubscriptionId: null })
        .where(eq(workspacesTable.id, workspaceId));

      console.log(`Webhook: downgraded workspace ${workspaceId} to free tier`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
