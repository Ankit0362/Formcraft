import { z, zodUndefinedModel } from "../../schema";
import { workspaceProcedure, apiKeyProcedure, router, requireTier } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { db, eq, and } from "@repo/database";
import * as schema from "@repo/database/schema";
import { requireRole } from "../../utils/rbac";
import crypto from "node:crypto";

const TAGS = ["Webhooks"];
const getPath = generatePath("/webhooks");

export const webhooksRouter = router({
  list: workspaceProcedure
    .meta({ openapi: { method: "GET", path: getPath("/list"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(
      z.array(
        z.object({
          id: z.string(),
          url: z.string(),
          active: z.boolean(),
          createdAt: z.date(),
        })
      )
    )
    .query(async ({ ctx }) => {
      const webhooks = await db
        .select()
        .from(schema.webhooksTable)
        .where(eq(schema.webhooksTable.workspaceId, ctx.activeWorkspace.id))
        .orderBy(schema.webhooksTable.createdAt);
      return webhooks;
    }),

  create: workspaceProcedure
    .meta({ openapi: { method: "POST", path: getPath("/create"), tags: TAGS } })
    .input(z.object({ url: z.string().url().refine((url) => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") return false;

        const host = parsed.hostname.toLowerCase();

        // FIX #22: Block IPv4 private/loopback ranges
        if (
          host === "localhost" ||
          host === "127.0.0.1" ||
          host.startsWith("10.") ||
          host.startsWith("192.168.") ||
          host.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
        ) {
          return false;
        }

        // FIX #22: Block IPv6 loopback and private ranges
        // ::1 (loopback), ::ffff: (IPv4-mapped), fc00::/7 (unique local), fe80::/10 (link-local)
        if (
          host === "::1" ||
          host === "[::1]" ||
          host.startsWith("::ffff:") ||
          host.startsWith("[::ffff:") ||
          host.startsWith("fc") ||
          host.startsWith("fd") ||
          host.startsWith("fe80") ||
          host.startsWith("[fc") ||
          host.startsWith("[fd") ||
          host.startsWith("[fe80")
        ) {
          return false;
        }

        return true;
      } catch {
        return false;
      }
  }, "URL must be a valid public HTTPS URL.") }))
    .output(
      z.object({
        id: z.string(),
        url: z.string(),
        secret: z.string().nullable(),
        active: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx.user.id, ctx.activeWorkspace.id, ["owner", "admin", "editor"]);

      // Tier gate: Webhooks require pro or above
      requireTier(ctx.activeWorkspace.tier, ["pro", "enterprise"]);

      const secret = crypto.randomBytes(32).toString("hex");

      const whResult = await db
        .insert(schema.webhooksTable)
        .values({
          workspaceId: ctx.activeWorkspace.id,
          url: input.url,
          secret,
          active: true,
        })
        .returning();
      const newWebhook = whResult[0]!;

      // Audit log
      await db.insert(schema.auditLogsTable).values({
        workspaceId: ctx.activeWorkspace.id,
        userId: ctx.user.id,
        action: "webhook_created",
        details: `Created webhook: ${input.url}`,
      });

      return {
        id: newWebhook.id,
        url: newWebhook.url,
        secret: newWebhook.secret,
        active: newWebhook.active,
      };
    }),

  delete: workspaceProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/delete/{id}"), tags: TAGS } })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx.user.id, ctx.activeWorkspace.id, ["owner", "admin"]);

      await db
        .delete(schema.webhooksTable)
        .where(
          and(
            eq(schema.webhooksTable.id, input.id),
            eq(schema.webhooksTable.workspaceId, ctx.activeWorkspace.id)
          )
        );

      // Audit log
      await db.insert(schema.auditLogsTable).values({
        workspaceId: ctx.activeWorkspace.id,
        userId: ctx.user.id,
        action: "webhook_deleted",
        details: `Deleted webhook: ${input.id}`,
      });

      return { success: true };
    }),

  getLogs: workspaceProcedure
    .meta({ openapi: { method: "GET", path: getPath("/logs"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(
      z.array(
        z.object({
          id: z.string(),
          webhookId: z.string(),
          event: z.string(),
          payload: z.any(),
          responseStatus: z.number().nullable(),
          deliveredAt: z.date(),
        })
      )
    )
    .query(async ({ ctx }) => {
      const logs = await db
        .select({
          id: schema.webhookLogsTable.id,
          webhookId: schema.webhookLogsTable.webhookId,
          event: schema.webhookLogsTable.event,
          payload: schema.webhookLogsTable.payload,
          responseStatus: schema.webhookLogsTable.responseStatus,
          deliveredAt: schema.webhookLogsTable.deliveredAt,
        })
        .from(schema.webhookLogsTable)
        .innerJoin(
          schema.webhooksTable,
          eq(schema.webhooksTable.id, schema.webhookLogsTable.webhookId)
        )
        .where(eq(schema.webhooksTable.workspaceId, ctx.activeWorkspace.id))
        .orderBy(schema.webhookLogsTable.deliveredAt);

      return logs;
    }),

  // ==========================================
  // DEVELOPER API ENDPOINTS
  // ==========================================
  listForApi: apiKeyProcedure
    .meta({ openapi: { method: "GET", path: getPath("/api/list"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(
      z.array(
        z.object({
          id: z.string(),
          url: z.string(),
          active: z.boolean(),
          createdAt: z.date(),
        })
      )
    )
    .query(async ({ ctx }) => {
      const webhooks = await db
        .select()
        .from(schema.webhooksTable)
        .where(eq(schema.webhooksTable.workspaceId, ctx.activeWorkspace.id))
        .orderBy(schema.webhooksTable.createdAt);
      return webhooks;
    }),

  createForApi: apiKeyProcedure
    .meta({ openapi: { method: "POST", path: getPath("/api/create"), tags: TAGS } })
    .input(z.object({ url: z.string().url().refine((url) => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") return false;

        const host = parsed.hostname.toLowerCase();

        if (
          host === "localhost" ||
          host === "127.0.0.1" ||
          host.startsWith("10.") ||
          host.startsWith("192.168.") ||
          host.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
        ) {
          return false;
        }

        if (
          host === "::1" ||
          host === "[::1]" ||
          host.startsWith("::ffff:") ||
          host.startsWith("[::ffff:") ||
          host.startsWith("fc") ||
          host.startsWith("fd") ||
          host.startsWith("fe80") ||
          host.startsWith("[fc") ||
          host.startsWith("[fd") ||
          host.startsWith("[fe80")
        ) {
          return false;
        }

        return true;
      } catch {
        return false;
      }
  }, "URL must be a valid public HTTPS URL.") }))
    .output(
      z.object({
        id: z.string(),
        url: z.string(),
        secret: z.string().nullable(),
        active: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Tier gate: Webhooks require pro or enterprise
      requireTier(ctx.activeWorkspace.tier, ["pro", "enterprise"]);

      const secret = crypto.randomBytes(32).toString("hex");

      const whResult = await db
        .insert(schema.webhooksTable)
        .values({
          workspaceId: ctx.activeWorkspace.id,
          url: input.url,
          secret,
          active: true,
        })
        .returning();
      const newWebhook = whResult[0]!;

      return {
        id: newWebhook.id,
        url: newWebhook.url,
        secret: newWebhook.secret,
        active: newWebhook.active,
      };
    }),
});
