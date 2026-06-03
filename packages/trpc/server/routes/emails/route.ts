import { z } from "../../schema";
import { workspaceProcedure, router, requireTier } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { db, eq, and } from "@repo/database";
import * as schema from "@repo/database/schema";
import { TRPCError } from "@trpc/server";

const TAGS = ["Emails"];
const getPath = generatePath("/emails");

export const emailsRouter = router({
  list: workspaceProcedure
    .meta({ openapi: { method: "GET", path: getPath("/list/{formId}"), tags: TAGS } })
    .input(z.object({ formId: z.string().uuid() }))
    .output(
      z.array(
        z.object({
          id: z.string(),
          recipient: z.string(),
          subject: z.string(),
          body: z.string(),
          sentAt: z.date(),
        })
      )
    )
    .query(async ({ input, ctx }) => {
      requireTier(ctx.activeWorkspace.tier, ["pro", "business", "enterprise"]);
      // Confirm ownership
      const forms = await db
        .select()
        .from(schema.formsTable)
        .where(
          and(
            eq(schema.formsTable.id, input.formId),
            eq(schema.formsTable.workspaceId, ctx.activeWorkspace.id)
          )
        )
        .limit(1);

      if (forms.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Form not found",
        });
      }

      const emails = await db
        .select()
        .from(schema.emailsTable)
        .where(eq(schema.emailsTable.formId, input.formId))
        .orderBy(schema.emailsTable.sentAt);

      return emails;
    }),

  listAll: workspaceProcedure
    .meta({ openapi: { method: "GET", path: getPath("/list-all"), tags: TAGS } })
    .input(z.object({}))
    .output(
      z.array(
        z.object({
          id: z.string(),
          recipient: z.string(),
          subject: z.string(),
          body: z.string(),
          sentAt: z.date(),
          formTitle: z.string(),
        })
      )
    )
    .query(async ({ ctx }) => {
      requireTier(ctx.activeWorkspace.tier, ["pro", "business", "enterprise"]);
      const emails = await db
        .select({
          id: schema.emailsTable.id,
          recipient: schema.emailsTable.recipient,
          subject: schema.emailsTable.subject,
          body: schema.emailsTable.body,
          sentAt: schema.emailsTable.sentAt,
          formTitle: schema.formsTable.title,
        })
        .from(schema.emailsTable)
        .innerJoin(
          schema.formsTable,
          eq(schema.formsTable.id, schema.emailsTable.formId)
        )
        .where(eq(schema.formsTable.workspaceId, ctx.activeWorkspace.id))
        .orderBy(schema.emailsTable.sentAt);

      return emails;
    }),
});
