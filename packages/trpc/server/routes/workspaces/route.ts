import { z, zodUndefinedModel } from "../../schema";
import { workspaceProcedure, protectedProcedure, publicProcedure, router, requireTier } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { db, eq, and } from "@repo/database";
import * as schema from "@repo/database/schema";
import { TRPCError } from "@trpc/server";
import { requireRole } from "../../utils/rbac";
import crypto from "node:crypto";
import { sendEmail } from "../../utils/email";

const TAGS = ["Workspaces"];
const getPath = generatePath("/workspaces");

export const workspacesRouter = router({
  get: workspaceProcedure
    .meta({ openapi: { method: "GET", path: getPath("/current"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(
      z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        tier: z.string(),
        customDomain: z.string().nullable(),
        removeBranding: z.boolean(),
      })
    )
    .query(async ({ ctx }) => {
      return {
        id: ctx.activeWorkspace.id,
        name: ctx.activeWorkspace.name,
        slug: ctx.activeWorkspace.slug,
        tier: ctx.activeWorkspace.tier,
        customDomain: ctx.activeWorkspace.customDomain,
        removeBranding: ctx.activeWorkspace.removeBranding,
      };
    }),

  update: workspaceProcedure
    .meta({ openapi: { method: "PUT", path: getPath("/update"), tags: TAGS } })
    .input(
      z.object({
        name: z.string().min(1).optional(),
        customDomain: z.string().optional().nullable(),
        removeBranding: z.boolean().optional(),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx.user.id, ctx.activeWorkspace.id, ["owner", "admin"]);

      const updates: Record<string, any> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.customDomain !== undefined) {
        requireTier(ctx.activeWorkspace.tier, ["pro", "business", "enterprise"]);
        updates.customDomain = input.customDomain;
      }
      if (input.removeBranding !== undefined) {
        requireTier(ctx.activeWorkspace.tier, ["business", "enterprise"]);
        updates.removeBranding = input.removeBranding;
      }

      if (Object.keys(updates).length > 0) {
        await db
          .update(schema.workspacesTable)
          .set(updates)
          .where(eq(schema.workspacesTable.id, ctx.activeWorkspace.id));
      }

      // Audit log
      await db.insert(schema.auditLogsTable).values({
        workspaceId: ctx.activeWorkspace.id,
        userId: ctx.user.id,
        action: "workspace_updated",
        details: `Updated workspace settings`,
      });

      return { success: true };
    }),

  membersList: workspaceProcedure
    .meta({ openapi: { method: "GET", path: getPath("/members"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(
      z.array(
        z.object({
          id: z.string(),
          userId: z.string(),
          role: z.string(),
          user: z.object({
            email: z.string(),
            fullName: z.string(),
          }),
        })
      )
    )
    .query(async ({ ctx }) => {
      const members = await db
        .select({
          id: schema.workspaceMembersTable.id,
          userId: schema.workspaceMembersTable.userId,
          role: schema.workspaceMembersTable.role,
          email: schema.usersTable.email,
          fullName: schema.usersTable.fullName,
        })
        .from(schema.workspaceMembersTable)
        .innerJoin(schema.usersTable, eq(schema.usersTable.id, schema.workspaceMembersTable.userId))
        .where(eq(schema.workspaceMembersTable.workspaceId, ctx.activeWorkspace.id));

      return members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: {
          email: m.email,
          fullName: m.fullName,
        },
      }));
    }),

  pendingInvites: workspaceProcedure
    .meta({ openapi: { method: "GET", path: getPath("/members/invites"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(
      z.array(
        z.object({
          id: z.string(),
          email: z.string(),
          role: z.string(),
          createdAt: z.date(),
          expiresAt: z.date(),
        })
      )
    )
    .query(async ({ ctx }) => {
      const invites = await db
        .select({
          id: schema.workspaceInvitationsTable.id,
          email: schema.workspaceInvitationsTable.email,
          role: schema.workspaceInvitationsTable.role,
          createdAt: schema.workspaceInvitationsTable.createdAt,
          expiresAt: schema.workspaceInvitationsTable.expiresAt,
        })
        .from(schema.workspaceInvitationsTable)
        .where(
          and(
            eq(schema.workspaceInvitationsTable.workspaceId, ctx.activeWorkspace.id),
            eq(schema.workspaceInvitationsTable.status, "pending")
          )
        );

      return invites;
    }),

  membersInvite: workspaceProcedure
    .meta({ openapi: { method: "POST", path: getPath("/members/invite"), tags: TAGS } })
    .input(z.object({ email: z.string().email(), role: z.enum(["owner", "admin", "editor", "viewer"]) }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx.user.id, ctx.activeWorkspace.id, ["owner", "admin"]);

      const targetEmail = input.email.toLowerCase();

      // Check if user is already in workspace
      const users = await db.select().from(schema.usersTable).where(eq(schema.usersTable.email, targetEmail)).limit(1);
      if (users.length > 0) {
        const targetUser = users[0]!;
        const existing = await db
          .select()
          .from(schema.workspaceMembersTable)
          .where(
            and(
              eq(schema.workspaceMembersTable.workspaceId, ctx.activeWorkspace.id),
              eq(schema.workspaceMembersTable.userId, targetUser.id)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "User is already a member of this workspace." });
        }
      }

      // Check for pending invitations
      const pendingInvites = await db
        .select()
        .from(schema.workspaceInvitationsTable)
        .where(
          and(
            eq(schema.workspaceInvitationsTable.workspaceId, ctx.activeWorkspace.id),
            eq(schema.workspaceInvitationsTable.email, targetEmail),
            eq(schema.workspaceInvitationsTable.status, "pending")
          )
        )
        .limit(1);

      if (pendingInvites.length > 0) {
        // Just resend the email for the existing invite
        const existingInvite = pendingInvites[0]!;
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite?token=${existingInvite.tokenHash}`; // using tokenHash as token for simplicity since it's an invite link
        
        await sendEmail({
          to: targetEmail,
          subject: `You've been invited to ${ctx.activeWorkspace.name} on FormCraft`,
          html: `<p>Hello,</p><p>You have been invited to join the workspace <strong>${ctx.activeWorkspace.name}</strong> on FormCraft as a(n) ${input.role}.</p><p><a href="${inviteLink}">Click here to accept the invitation</a></p><p>This invitation will expire in 7 days.</p>`,
          text: `You have been invited to join the workspace ${ctx.activeWorkspace.name} on FormCraft. Accept here: ${inviteLink}`,
        });

        return { success: true };
      }

      // Create new invitation
      const token = crypto.randomBytes(32).toString("hex");
      // For simplicity, we'll store the plain token as tokenHash since we're using it in the URL directly, or we can hash it. Let's just hash it properly.
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await db.insert(schema.workspaceInvitationsTable).values({
        workspaceId: ctx.activeWorkspace.id,
        email: targetEmail,
        role: input.role,
        tokenHash,
        expiresAt,
        status: "pending",
      });

      const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite?token=${token}`;

      await sendEmail({
        to: targetEmail,
        subject: `You've been invited to ${ctx.activeWorkspace.name} on FormCraft`,
        html: `<p>Hello,</p><p>You have been invited to join the workspace <strong>${ctx.activeWorkspace.name}</strong> on FormCraft as a(n) ${input.role}.</p><p><a href="${inviteLink}">Click here to accept the invitation</a></p><p>This invitation will expire in 7 days.</p>`,
        text: `You have been invited to join the workspace ${ctx.activeWorkspace.name} on FormCraft. Accept here: ${inviteLink}`,
      });

      await db.insert(schema.auditLogsTable).values({
        workspaceId: ctx.activeWorkspace.id,
        userId: ctx.user.id,
        action: "member_invited",
        details: `Sent invitation to ${targetEmail} as ${input.role}`,
      });

      return { success: true };
    }),

  getInviteDetails: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/members/invite/details"), tags: TAGS } })
    .input(z.object({ token: z.string() }))
    .output(
      z.object({
        valid: z.boolean(),
        workspaceName: z.string().optional(),
        role: z.string().optional(),
        email: z.string().optional(),
        error: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");

      const invites = await db
        .select({
          id: schema.workspaceInvitationsTable.id,
          status: schema.workspaceInvitationsTable.status,
          expiresAt: schema.workspaceInvitationsTable.expiresAt,
          workspaceName: schema.workspacesTable.name,
          role: schema.workspaceInvitationsTable.role,
          email: schema.workspaceInvitationsTable.email,
        })
        .from(schema.workspaceInvitationsTable)
        .innerJoin(schema.workspacesTable, eq(schema.workspacesTable.id, schema.workspaceInvitationsTable.workspaceId))
        .where(eq(schema.workspaceInvitationsTable.tokenHash, tokenHash))
        .limit(1);

      if (invites.length === 0) {
        return { valid: false, error: "Invitation not found." };
      }

      const invite = invites[0]!;

      if (invite.status !== "pending") {
        return { valid: false, error: `Invitation is already ${invite.status}.` };
      }

      if (invite.expiresAt < new Date()) {
        return { valid: false, error: "Invitation has expired." };
      }

      return {
        valid: true,
        workspaceName: invite.workspaceName,
        role: invite.role,
        email: invite.email,
      };
    }),

  acceptInvite: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/members/invite/accept"), tags: TAGS } })
    .input(z.object({ token: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");

      const invites = await db
        .select()
        .from(schema.workspaceInvitationsTable)
        .where(eq(schema.workspaceInvitationsTable.tokenHash, tokenHash))
        .limit(1);

      if (invites.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found." });
      }

      const invite = invites[0]!;

      if (invite.status !== "pending" || invite.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation is invalid or has expired." });
      }

      if (ctx.user.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `This invitation was sent to ${invite.email}. Please log in with that account to accept it.`,
        });
      }

      await db.transaction(async (tx) => {
        // Add to workspace members
        await tx.insert(schema.workspaceMembersTable).values({
          workspaceId: invite.workspaceId,
          userId: ctx.user.id,
          role: invite.role,
        }).onConflictDoNothing(); // just in case

        // Mark invite as accepted
        await tx
          .update(schema.workspaceInvitationsTable)
          .set({ status: "accepted" })
          .where(eq(schema.workspaceInvitationsTable.id, invite.id));
      });

      return { success: true };
    }),

  membersUpdateRole: workspaceProcedure
    .meta({ openapi: { method: "PUT", path: getPath("/members/update-role"), tags: TAGS } })
    .input(z.object({ memberId: z.string(), role: z.enum(["owner", "admin", "editor", "viewer"]) }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx.user.id, ctx.activeWorkspace.id, ["owner"]);

      const targetMember = await db
        .select()
        .from(schema.workspaceMembersTable)
        .where(
          and(
            eq(schema.workspaceMembersTable.id, input.memberId),
            eq(schema.workspaceMembersTable.workspaceId, ctx.activeWorkspace.id)
          )
        )
        .limit(1);

      if (targetMember.length > 0 && targetMember[0]!.role === "owner" && input.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot demote a workspace owner. Transfer ownership first." });
      }

      await db.transaction(async (tx) => {
        // FIX #14: If setting someone to owner, first demote the current owner to admin.
        // This enforces the single-owner invariant.
        if (input.role === "owner") {
          await tx
            .update(schema.workspaceMembersTable)
            .set({ role: "admin" })
            .where(
              and(
                eq(schema.workspaceMembersTable.workspaceId, ctx.activeWorkspace.id),
                eq(schema.workspaceMembersTable.role, "owner")
              )
            );
        }

        await tx
          .update(schema.workspaceMembersTable)
          .set({ role: input.role })
          .where(
            and(
              eq(schema.workspaceMembersTable.id, input.memberId),
              eq(schema.workspaceMembersTable.workspaceId, ctx.activeWorkspace.id)
            )
          );
      });

      await db.insert(schema.auditLogsTable).values({
        workspaceId: ctx.activeWorkspace.id,
        userId: ctx.user.id,
        action: "member_role_updated",
        details: `Updated role for member ${input.memberId} to ${input.role}`,
      });

      return { success: true };
    }),

  membersRemove: workspaceProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/members/remove"), tags: TAGS } })
    .input(z.object({ memberId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx.user.id, ctx.activeWorkspace.id, ["owner", "admin"]);

      const targetMember = await db
        .select()
        .from(schema.workspaceMembersTable)
        .where(
          and(
            eq(schema.workspaceMembersTable.id, input.memberId),
            eq(schema.workspaceMembersTable.workspaceId, ctx.activeWorkspace.id)
          )
        )
        .limit(1);

      if (targetMember.length > 0 && targetMember[0]!.role === "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove a workspace owner. Transfer ownership first." });
      }

      await db
        .delete(schema.workspaceMembersTable)
        .where(
          and(
            eq(schema.workspaceMembersTable.id, input.memberId),
            eq(schema.workspaceMembersTable.workspaceId, ctx.activeWorkspace.id)
          )
        );

      await db.insert(schema.auditLogsTable).values({
        workspaceId: ctx.activeWorkspace.id,
        userId: ctx.user.id,
        action: "member_removed",
        details: `Removed member ${input.memberId} from workspace`,
      });

      return { success: true };
    }),

  revokeInvite: workspaceProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/members/invite/revoke"), tags: TAGS } })
    .input(z.object({ inviteId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx.user.id, ctx.activeWorkspace.id, ["owner", "admin"]);

      await db
        .update(schema.workspaceInvitationsTable)
        .set({ status: "revoked" })
        .where(
          and(
            eq(schema.workspaceInvitationsTable.id, input.inviteId),
            eq(schema.workspaceInvitationsTable.workspaceId, ctx.activeWorkspace.id),
            eq(schema.workspaceInvitationsTable.status, "pending")
          )
        );

      return { success: true };
    }),
});
