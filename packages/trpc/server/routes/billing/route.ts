import { z } from "zod";
import { protectedProcedure, router } from "../../trpc";
import { workspacesTable } from "@repo/database/models/workspace";
import { workspaceMembersTable } from "@repo/database/models/workspace";
import { eq, and } from "@repo/database";
import { TRPCError } from "@trpc/server";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db } from "@repo/database";

// Initialize Razorpay
// NOTE: Use RAZORPAY_KEY_ID (no NEXT_PUBLIC_ prefix) in the API server.
// NEXT_PUBLIC_ prefix is only processed by Next.js build — it's undefined in Express/Node.
const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

// Allowed tiers that can be set via billing
const ALLOWED_BILLING_TIERS = ["pro", "enterprise"] as const;
type BillingTier = (typeof ALLOWED_BILLING_TIERS)[number];

/**
 * Helper: assert the calling user owns (or is admin of) the given workspaceId.
 * Throws FORBIDDEN if not a member with an appropriate role.
 */
async function assertWorkspaceOwner(userId: string, workspaceId: string) {
  const memberships = await db
    .select()
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.userId, userId),
        eq(workspaceMembersTable.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (memberships.length === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this workspace.",
    });
  }

  const role = memberships[0]!.role;
  if (role !== "owner" && role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only workspace owners or admins can manage billing.",
    });
  }
}

export const billingRouter = router({
  /**
   * Generates a Razorpay Subscription to upgrade a workspace.
   * FIX #1, #2: Caller must be owner/admin of the target workspaceId.
   */
  createSubscription: protectedProcedure
    .input(z.object({
      workspaceId: z.string().uuid(),
      tier: z.enum(ALLOWED_BILLING_TIERS),
    }))
    .mutation(async ({ ctx, input }) => {
      const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.",
        });
      }

      // FIX #2: Verify caller owns the workspace they're trying to upgrade
      await assertWorkspaceOwner(ctx.user.id, input.workspaceId);

      const workspaces = await db
        .select()
        .from(workspacesTable)
        .where(eq(workspacesTable.id, input.workspaceId))
        .limit(1);

      const workspace = workspaces[0];
      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      try {
        const razorpay = getRazorpayInstance();
        // Hardcoded price: Pro = ₹1999/mo, Enterprise = ₹4999/mo
        const amount = input.tier === "pro" ? 199900 : 499900;

        let planId = workspace.razorpayPlanId;

        // If we don't have a plan for this workspace, create one
        if (!planId) {
          const plan = await razorpay.plans.create({
            period: "monthly",
            interval: 1,
            item: {
              name: `FormCraft ${input.tier.toUpperCase()} Plan`,
              amount: amount,
              currency: "INR",
              description: `Monthly subscription for ${input.tier} tier`,
            },
          });
          planId = plan.id;

          await db
            .update(workspacesTable)
            .set({ razorpayPlanId: planId })
            .where(eq(workspacesTable.id, workspace.id));
        }

        // Create the subscription
        const subscription = await razorpay.subscriptions.create({
          plan_id: planId,
          customer_notify: 1,
          total_count: 120, // 10 years
          notes: {
            workspaceId: workspace.id,
            // FIX #3: Store a validated tier value, not user-provided arbitrary string
            tier: input.tier,
          },
        });

        // Update workspace with the pending subscription ID
        await db
          .update(workspacesTable)
          .set({ razorpaySubscriptionId: subscription.id })
          .where(eq(workspacesTable.id, workspace.id));

        return {
          subscriptionId: subscription.id,
          razorpayKeyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        };
      } catch (error: any) {
        const statusCode = error?.statusCode ?? error?.status;
        const razorpayDesc = error?.error?.description || error?.error || error?.message || "";

        console.error("Razorpay error:", JSON.stringify(error?.error ?? error));

        // 401 = Invalid API keys.
        // ONLY simulate checkout in local dev (never in production).
        if (statusCode === 401) {
          if (process.env.NODE_ENV === "production") {
            // In production, invalid keys must be fixed — never bypass payment.
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Payment gateway misconfigured. Please contact support.",
            });
          }
          // Local dev only: simulate a checkout so the UI flow can be tested.
          console.warn("[DEV MODE] Razorpay auth failed — returning simulated subscription for local testing.");
          return {
            subscriptionId: `sub_DEV_${Date.now()}`,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
            devMode: true,
          };
        }

        const message = razorpayDesc || "Failed to create payment session. Please try again.";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  /**
   * Verifies the payment signature after checkout succeeds.
   * FIX #1: Caller must be owner/admin of the target workspaceId.
   */
  verifyPayment: protectedProcedure
    .input(z.object({
      workspaceId: z.string().uuid(),
      razorpay_payment_id: z.string(),
      razorpay_subscription_id: z.string(),
      razorpay_signature: z.string(),
      tier: z.enum(ALLOWED_BILLING_TIERS), // FIX #3: strictly typed tier
    }))
    .mutation(async ({ ctx, input }) => {
      // FIX #1: Verify caller owns the workspace they're verifying payment for
      await assertWorkspaceOwner(ctx.user.id, input.workspaceId);

      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Razorpay secret not configured" });
      }

      // Dev bypass: ONLY allowed in non-production AND only when explicitly enabled.
      // This ensures no one can fake a payment in production by sending dev_bypass strings.
      const isProduction = process.env.NODE_ENV === "production";
      const devBillingEnabled = process.env.ENABLE_DEV_BILLING === "true";
      const isDevBypass =
        !isProduction &&
        devBillingEnabled &&
        input.razorpay_signature === "dev_bypass" &&
        input.razorpay_payment_id.startsWith("pay_DEV_") &&
        input.razorpay_subscription_id.startsWith("sub_DEV_");

      // In production, dev_bypass strings are treated as tampered requests — reject immediately.
      if (isProduction && (
        input.razorpay_signature === "dev_bypass" ||
        input.razorpay_payment_id.startsWith("pay_DEV_") ||
        input.razorpay_subscription_id.startsWith("sub_DEV_")
      )) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid payment data." });
      }

      if (!isDevBypass) {
        // HMAC signature verification — the only cryptographic proof that Razorpay
        // actually processed a payment. Without this passing, no tier upgrade happens.
        const expectedSignature = crypto
          .createHmac("sha256", secret)
          .update(input.razorpay_payment_id + "|" + input.razorpay_subscription_id)
          .digest("hex");

        if (expectedSignature !== input.razorpay_signature) {
          console.error("Signature mismatch — possible tampered payment request.", {
            workspaceId: input.workspaceId,
            userId: ctx.user.id,
          });
          throw new TRPCError({ code: "BAD_REQUEST", message: "Payment verification failed. If you completed payment, contact support." });
        }
      }

      // Fetch workspace and confirm the subscription ID matches what we stored
      // (prevents replaying someone else's valid payment against a different workspace)
      const workspaces = await db
        .select()
        .from(workspacesTable)
        .where(eq(workspacesTable.id, input.workspaceId))
        .limit(1);

      const workspace = workspaces[0];
      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      // In dev bypass, skip the subscription ID match check
      if (!isDevBypass && workspace.razorpaySubscriptionId !== input.razorpay_subscription_id) {
        console.error("Subscription ID mismatch — possible payment replay attack.", {
          workspaceId: input.workspaceId,
          storedId: workspace.razorpaySubscriptionId,
          receivedId: input.razorpay_subscription_id,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment details do not match this workspace. Contact support.",
        });
      }

      // ✅ All checks passed — safe to upgrade the workspace tier
      await db
        .update(workspacesTable)
        .set({ tier: input.tier })
        .where(eq(workspacesTable.id, input.workspaceId));

      return { success: true };
    }),

  /**
   * Get current billing status for the active workspace.
   */
  getStatus: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceOwner(ctx.user.id, input.workspaceId);

      const workspaces = await db
        .select()
        .from(workspacesTable)
        .where(eq(workspacesTable.id, input.workspaceId))
        .limit(1);

      const workspace = workspaces[0];
      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      return {
        tier: workspace.tier,
        hasActiveSubscription: !!workspace.razorpaySubscriptionId,
        subscriptionId: workspace.razorpaySubscriptionId,
      };
    }),

  /**
   * Cancel an active subscription.
   */
  cancelSubscription: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Verify ownership
      await assertWorkspaceOwner(ctx.user.id, input.workspaceId);

      const workspaces = await db
        .select()
        .from(workspacesTable)
        .where(eq(workspacesTable.id, input.workspaceId))
        .limit(1);

      const workspace = workspaces[0];
      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      const subscriptionId = workspace.razorpaySubscriptionId;
      if (!subscriptionId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No active subscription found." });
      }

      // 2. Cancel in Razorpay (unless it's a dev simulated sub)
      if (!subscriptionId.startsWith("sub_DEV_")) {
        try {
          const razorpay = getRazorpayInstance();
          // The true parameter cancels immediately rather than at cycle end
          await razorpay.subscriptions.cancel(subscriptionId, true);
        } catch (error: any) {
          console.error("Failed to cancel Razorpay subscription:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to cancel subscription with payment provider. Please contact support.",
          });
        }
      }

      // 3. Update DB
      await db
        .update(workspacesTable)
        .set({ 
          razorpaySubscriptionId: null,
          tier: "free",
        })
        .where(eq(workspacesTable.id, workspace.id));

      return { success: true };
    }),
});
