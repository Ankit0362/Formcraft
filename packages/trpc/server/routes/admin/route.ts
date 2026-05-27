import { z } from "zod";
import { router, protectedProcedure } from "../../trpc";
import { db, eq, sql } from "@repo/database";
import * as schema from "@repo/database/schema";
import { TRPCError } from "@trpc/server";

// Middleware: only super admins can call these routes
async function requireSuperAdmin(userId: string) {
  const users = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.id, userId))
    .limit(1);

  if (!users[0]?.isSuperAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Super admin access required.",
    });
  }
}

const VALID_TIERS = ["free", "pro", "business", "enterprise"] as const;

export const adminRouter = router({
  /**
   * List ALL users in the system
   */
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    await requireSuperAdmin(ctx.user.id);

    const users = await db
      .select({
        id: schema.usersTable.id,
        fullName: schema.usersTable.fullName,
        email: schema.usersTable.email,
        isSuperAdmin: schema.usersTable.isSuperAdmin,
        emailVerified: schema.usersTable.emailVerified,
        createdAt: schema.usersTable.createdAt,
      })
      .from(schema.usersTable)
      .orderBy(schema.usersTable.createdAt);

    return users;
  }),

  /**
   * List ALL workspaces with owner info and current tier
   */
  listWorkspaces: protectedProcedure.query(async ({ ctx }) => {
    await requireSuperAdmin(ctx.user.id);

    const workspaces = await db
      .select({
        id: schema.workspacesTable.id,
        name: schema.workspacesTable.name,
        slug: schema.workspacesTable.slug,
        tier: schema.workspacesTable.tier,
        createdAt: schema.workspacesTable.createdAt,
      })
      .from(schema.workspacesTable)
      .orderBy(schema.workspacesTable.createdAt);

    // Fetch owner for each workspace
    const results = await Promise.all(
      workspaces.map(async (ws) => {
        const ownerMembership = await db
          .select({
            userId: schema.workspaceMembersTable.userId,
            email: schema.usersTable.email,
            fullName: schema.usersTable.fullName,
          })
          .from(schema.workspaceMembersTable)
          .innerJoin(
            schema.usersTable,
            eq(schema.usersTable.id, schema.workspaceMembersTable.userId)
          )
          .where(
            eq(schema.workspaceMembersTable.workspaceId, ws.id)
          )
          .limit(1);

        return {
          ...ws,
          owner: ownerMembership[0] ?? null,
        };
      })
    );

    return results;
  }),

  /**
   * Upgrade or downgrade any workspace's tier
   */
  setWorkspaceTier: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        tier: z.enum(VALID_TIERS),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireSuperAdmin(ctx.user.id);

      const workspaces = await db
        .select()
        .from(schema.workspacesTable)
        .where(eq(schema.workspacesTable.id, input.workspaceId))
        .limit(1);

      if (!workspaces[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found." });
      }

      await db
        .update(schema.workspacesTable)
        .set({ tier: input.tier })
        .where(eq(schema.workspacesTable.id, input.workspaceId));

      // Log it
      await db.insert(schema.auditLogsTable).values({
        workspaceId: input.workspaceId,
        userId: ctx.user.id,
        action: "admin_tier_override",
        details: `Super admin changed tier to "${input.tier}" for workspace "${workspaces[0].name}"`,
      });

      return { success: true, newTier: input.tier };
    }),

  /**
   * Grant super admin rights to a user
   */
  setSuperAdmin: protectedProcedure
    .input(z.object({ userId: z.string().uuid(), isSuperAdmin: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await requireSuperAdmin(ctx.user.id);

      // Cannot demote yourself
      if (input.userId === ctx.user.id && !input.isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot remove your own super admin access.",
        });
      }

      await db
        .update(schema.usersTable)
        .set({ isSuperAdmin: input.isSuperAdmin })
        .where(eq(schema.usersTable.id, input.userId));

      return { success: true };
    }),

  /**
   * Get platform-wide stats
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    await requireSuperAdmin(ctx.user.id);

    // Fix: use sql`count(*)` — db.$count() is not available in this Drizzle version
    const [usersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.usersTable);

    const [workspacesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.workspacesTable);

    const [formsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.formsTable);

    const [responsesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.formResponsesTable);

    // Tier breakdown
    const allWorkspaces = await db
      .select({ tier: schema.workspacesTable.tier })
      .from(schema.workspacesTable);

    const tierBreakdown = allWorkspaces.reduce(
      (acc, ws) => {
        acc[ws.tier] = (acc[ws.tier] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalUsers: Number(usersCount?.count ?? 0),
      totalWorkspaces: Number(workspacesCount?.count ?? 0),
      totalForms: Number(formsCount?.count ?? 0),
      totalResponses: Number(responsesCount?.count ?? 0),
      tierBreakdown,
    };
  }),
});
