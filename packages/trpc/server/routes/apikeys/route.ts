import { z, zodUndefinedModel } from "../../schema";
import { workspaceProcedure, router, requireTier } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { db, eq, and } from "@repo/database";
import * as schema from "@repo/database/schema";
import crypto from "node:crypto";
import { requireRole } from "../../utils/rbac";

const TAGS = ["API Keys"];
const getPath = generatePath("/apikeys");

export const apiKeysRouter = router({
  list: workspaceProcedure
    .meta({ openapi: { method: "GET", path: getPath("/list"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(
      z.array(
        z.object({
          id: z.string(),
          key: z.string(),
          name: z.string(),
          createdAt: z.date(),
        })
      )
    )
    .query(async ({ ctx }) => {
      const keys = await db
        .select()
        .from(schema.apiKeysTable)
        .where(eq(schema.apiKeysTable.workspaceId, ctx.activeWorkspace.id))
        .orderBy(schema.apiKeysTable.createdAt);
      return keys.map((k) => ({
        id: k.id,
        name: k.name,
        createdAt: k.createdAt,
        // FIX #15: Show a unique hint so users can tell keys apart
        key: k.keyHint ? `fc_live_...${ k.keyHint}` : "fc_live_" + "*".repeat(8),
      }));
    }),

  create: workspaceProcedure
    .meta({ openapi: { method: "POST", path: getPath("/create"), tags: TAGS } })
    .input(z.object({ name: z.string().min(1) }))
    .output(
      z.object({
        id: z.string(),
        key: z.string(),
        name: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx.user.id, ctx.activeWorkspace.id, ["owner", "admin"]);

      // Tier gate: API keys require pro or above
      requireTier(ctx.activeWorkspace.tier, ["pro", "enterprise"]);

      // Generate a new secure API Key
      const rawKey = `fc_live_${crypto.randomBytes(24).toString("hex")}`;
      const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");
      // FIX #15: Store the last 4 chars of the raw key as a display hint
      const keyHint = rawKey.slice(-4);
      const result = await db
        .insert(schema.apiKeysTable)
        .values({
          workspaceId: ctx.activeWorkspace.id,
          key: hashedKey,
          keyHint,
          name: input.name,
        })
        .returning();

      const newKey = result[0]!;

      // Audit log
      await db.insert(schema.auditLogsTable).values({
        workspaceId: ctx.activeWorkspace.id,
        userId: ctx.user.id,
        action: "api_key_created",
        details: `Created API key: ${input.name}`,
      });

      return {
        id: newKey.id,
        key: rawKey, // Only returned once at creation time
        name: newKey.name,
      };
    }),

  delete: workspaceProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/delete/{id}"), tags: TAGS } })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx.user.id, ctx.activeWorkspace.id, ["owner", "admin"]);

      await db
        .delete(schema.apiKeysTable)
        .where(
          and(
            eq(schema.apiKeysTable.id, input.id),
            eq(schema.apiKeysTable.workspaceId, ctx.activeWorkspace.id)
          )
        );

      // Audit log
      await db.insert(schema.auditLogsTable).values({
        workspaceId: ctx.activeWorkspace.id,
        userId: ctx.user.id,
        action: "api_key_deleted",
        details: `Deleted API key: ${input.id}`,
      });

      return { success: true };
    }),
});
