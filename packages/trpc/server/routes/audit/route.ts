import { z } from "../../schema";
import { workspaceProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { db, eq, sql } from "@repo/database";
import * as schema from "@repo/database/schema";

const TAGS = ["Audit"];
const getPath = generatePath("/audit");

export const auditRouter = router({
  list: workspaceProcedure
    .meta({ openapi: { method: "GET", path: getPath("/list"), tags: TAGS } })
    .input(z.object({ page: z.number().int().min(1).default(1), limit: z.number().int().min(1).max(100).default(50) }))
    .output(
      z.object({
        logs: z.array(
          z.object({
            id: z.string(),
            action: z.string(),
            details: z.string().nullable(),
            createdAt: z.date(),
          })
        ),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const offset = (input.page - 1) * input.limit;

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.auditLogsTable)
        .where(eq(schema.auditLogsTable.workspaceId, ctx.activeWorkspace.id));
      const total = Number(countResult[0]?.count) || 0;

      const logs = await db
        .select({
          id: schema.auditLogsTable.id,
          action: schema.auditLogsTable.action,
          details: schema.auditLogsTable.details,
          createdAt: schema.auditLogsTable.createdAt,
        })
        .from(schema.auditLogsTable)
        .where(eq(schema.auditLogsTable.workspaceId, ctx.activeWorkspace.id))
        .orderBy(schema.auditLogsTable.createdAt)
        .limit(input.limit)
        .offset(offset);

      return { logs, total, page: input.page, limit: input.limit };
    }),
});
