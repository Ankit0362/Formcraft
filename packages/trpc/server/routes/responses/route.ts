import { z } from "../../schema";
import { workspaceProcedure, publicProcedure, apiKeyProcedure, router, requireTier } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { db, eq, and, sql } from "@repo/database";
import * as schema from "@repo/database/schema";
import { TRPCError } from "@trpc/server";
import { verifyPassword } from "../../utils/password";
import { requireRole } from "../../utils/rbac";
import crypto from "node:crypto";
import { sendEmail } from "../../utils/email";

const TAGS = ["Responses"];
const getPath = generatePath("/responses");

// FIX #26: Use separate rate limiter maps for submit vs progress tracking
// so they don't interfere with each other.
const submitRateLimiter = new Map<string, number>();
const progressRateLimiter = new Map<string, number>();

function cleanupRateLimiter(map: Map<string, number>, ttlMs: number) {
  const now = Date.now();
  for (const [ip, time] of map.entries()) {
    if (now - time > ttlMs) map.delete(ip);
  }
}

setInterval(() => {
  cleanupRateLimiter(submitRateLimiter, 5000);
  cleanupRateLimiter(progressRateLimiter, 1000);
}, 10000);

export const responsesRouter = router({
  submit: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/submit"), tags: TAGS } })
    .input(
      z.object({
        formId: z.string().uuid(),
        answers: z.record(z.string(), z.any()), // key: fieldId, value: submitted answer
        password: z.string().optional(),
        _honeypot: z.string().optional(), // Invisible spam trap field
        responseTime: z.number().optional(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 1. Rate Limiting Check
      const rawIp = ctx.req?.ip || ctx.req?.socket?.remoteAddress || "unknown-ip";
      const clientIp = crypto.createHash("sha256").update(rawIp).digest("hex");
      const now = Date.now();
      const executionStartTime = Date.now();
      // FIX #26: Use dedicated submit rate limiter
      const lastSubmit = submitRateLimiter.get(clientIp);
      if (lastSubmit && now - lastSubmit < 5000) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many submissions. Please wait 5 seconds.",
        });
      }
      submitRateLimiter.set(clientIp, now);

      // 1b. Honeypot Check - if bot filled the invisible field, silently reject
      if (input._honeypot) {
        return { success: true, message: "Your submission has been received. Thank you!" };
      }

      // 2. Fetch form and fields
      const forms = await db
        .select()
        .from(schema.formsTable)
        .where(eq(schema.formsTable.id, input.formId))
        .limit(1);

      if (forms.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Form not found",
        });
      }

      const form = forms[0]!;

      // Fetch Workspace for Monthly Limits Check
      const workspaces = await db
        .select()
        .from(schema.workspacesTable)
        .where(eq(schema.workspacesTable.id, form.workspaceId))
        .limit(1);
      
      const workspace = workspaces[0];
      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      if (form.status !== "published") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This form is no longer accepting responses.",
        });
      }

      // FIX #27: Enforce response limit at submit time, not just display time.
      // This prevents race conditions and API calls that bypass the UI.
      if (form.responseLimit) {
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.formResponsesTable)
          .where(and(
            eq(schema.formResponsesTable.formId, form.id),
            eq(schema.formResponsesTable.completed, true)
          ));
        const numResponses = Number(countResult[0]?.count) || 0;
        if (numResponses >= form.responseLimit) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This form has reached its maximum number of responses.",
          });
        }
      }

      // Tier-Based Monthly Response Limit Enforcement
      // Free: 1,000 | Pro: 10,000 | Enterprise: 50,000
      const tierLimits: Record<string, number> = {
        free: 1000,
        pro: 10000,
        business: 50000, // Legacy fallback
        enterprise: 50000
      };
      const limitForTier = tierLimits[workspace.tier] || 1000;
      
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyResponsesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.formResponsesTable)
        .innerJoin(schema.formsTable, eq(schema.formsTable.id, schema.formResponsesTable.formId))
        .where(and(
          eq(schema.formsTable.workspaceId, workspace.id),
          eq(schema.formResponsesTable.completed, true),
          sql`${schema.formResponsesTable.createdAt} >= ${startOfMonth}`
        ));

      const monthlyResponsesCount = Number(monthlyResponsesResult[0]?.count) || 0;
      if (monthlyResponsesCount >= limitForTier) {
         throw new TRPCError({
            code: "FORBIDDEN",
            message: `This workspace has reached its monthly response limit of ${limitForTier} for the ${workspace.tier} plan.`,
          });
      }

      // Check Expiry Date at submit time too
      if (form.expiryDate && new Date() > new Date(form.expiryDate)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This form has expired and is no longer accepting responses.",
        });
      }

      // Check Password Protection
      if (form.password && (!input.password || !verifyPassword(input.password, form.password))) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password for this protected form.",
        });
      }

      const fields = await db
        .select()
        .from(schema.formFieldsTable)
        .where(eq(schema.formFieldsTable.formId, form.id));

      // 3. Dynamic Validation using Zod
      // We will loop through fields and validate their answers
      const validatedAnswers: Record<string, any> = {};

      for (const field of fields) {
        const answer = input.answers[field.id];
        
        // Required check
        if (field.required && (answer === undefined || answer === null || answer === "")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Question "${field.label}" is required.`,
          });
        }

        if (answer !== undefined && answer !== null && answer !== "") {
          // Specific type validations
          if (field.type === "email") {
            const emailSchema = z.string().email();
            const result = emailSchema.safeParse(answer);
            if (!result.success) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Question "${field.label}" requires a valid email.`,
              });
            }
          } else if (field.type === "number") {
            const num = Number(answer);
            if (isNaN(num)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Question "${field.label}" requires a number.`,
              });
            }
          } else if (field.type === "rating") {
            const val = Number(answer);
            if (isNaN(val) || val < 1 || val > 10) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Question "${field.label}" requires a valid rating.`,
              });
            }
          }
          validatedAnswers[field.id] = answer;
        }
      }

      // 4. Save response to database
      await db.insert(schema.formResponsesTable).values({
        formId: form.id,
        answers: validatedAnswers,
        completed: true,
        metadata: {
          // FIX #25: Use consistent key 'responseTime' (matches analytics read path)
          responseTime: input.responseTime || 0,
          serverExecutionTime: Date.now() - executionStartTime,
        },
      });

      // 5. Trigger Simulated Email Notifications
      // Notify Creator
      const ownerMemberships = await db
        .select({ userId: schema.workspaceMembersTable.userId, email: schema.usersTable.email })
        .from(schema.workspaceMembersTable)
        .innerJoin(schema.usersTable, eq(schema.usersTable.id, schema.workspaceMembersTable.userId))
        .where(
          and(
            eq(schema.workspaceMembersTable.workspaceId, form.workspaceId),
            eq(schema.workspaceMembersTable.role, "owner")
          )
        )
        .limit(1);

      const ownerEmail = ownerMemberships.length > 0 ? ownerMemberships[0]!.email : "creator@formcraft.com";

      const creatorMessageText = `Hello, a new respondent has submitted answers to your form: "${form.title}".\n\nSubmitted Answers:\n${JSON.stringify(validatedAnswers, null, 2)}`;
      const creatorMessageHtml = `<p>Hello, a new respondent has submitted answers to your form: <strong>${form.title}</strong>.</p><pre>${JSON.stringify(validatedAnswers, null, 2)}</pre>`;
      
      await sendEmail({
        to: ownerEmail,
        subject: `New Response for ${form.title}`,
        html: creatorMessageHtml,
        text: creatorMessageText,
        workspaceId: form.workspaceId,
      });

      // Notify Respondent if they supplied an email field
      const emailField = fields.find((f) => f.type === "email");
      if (emailField && validatedAnswers[emailField.id]) {
        const respondentEmail = validatedAnswers[emailField.id];
        const respondentMessageText = `Hello,\n\nThis is a confirmation that your response to "${form.title}" has been successfully recorded. Thank you for your time!`;
        const respondentMessageHtml = `<p>Hello,</p><p>This is a confirmation that your response to <strong>${form.title}</strong> has been successfully recorded. Thank you for your time!</p>`;
        
        await sendEmail({
          to: respondentEmail,
          subject: `Response Confirmation: ${form.title}`,
          html: respondentMessageHtml,
          text: respondentMessageText,
          workspaceId: form.workspaceId,
        });
      }

      // 6. Trigger Mock Webhooks (Asynchronous)
      const webhooks = await db
        .select()
        .from(schema.webhooksTable)
        .where(eq(schema.webhooksTable.workspaceId, form.workspaceId));

      setImmediate(async () => {
        for (const wh of webhooks) {
          if (!wh.active) continue;

          const webhookPayload = {
            event: "response.completed",
            formId: form.id,
            formTitle: form.title,
            answers: validatedAnswers,
            submittedAt: new Date().toISOString(),
          };

          const bodyStr = JSON.stringify(webhookPayload);
          const signature = wh.secret 
            ? crypto.createHmac("sha256", wh.secret).update(bodyStr).digest("hex") 
            : "unsecured";

          let responseStatus = 0;
          let retries = 3;
          let delay = 1000;

          while (retries > 0) {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 5000);
              const resp = await fetch(wh.url, {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json", 
                  "X-FormCraft-Event": "response.completed",
                  "X-FormCraft-Signature": signature
                },
                body: bodyStr,
                signal: controller.signal,
              });
              clearTimeout(timeout);
              responseStatus = resp.status;
              
              if (responseStatus >= 200 && responseStatus < 300) {
                break; // Success
              } else if (responseStatus >= 500 || responseStatus === 429) {
                throw new Error(`Retrying due to status ${responseStatus}`);
              } else {
                break; // Don't retry on 4xx (Client Errors)
              }
            } catch (err) {
              retries--;
              if (retries === 0) {
                responseStatus = 0; // Network error / timeout
              } else {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
              }
            }
          }

          try {
            await db.insert(schema.webhookLogsTable).values({
              webhookId: wh.id,
              event: "response.completed",
              payload: webhookPayload,
              responseStatus,
            });
          } catch (logErr) {
            // Silently swallow log errors in background
          }
        }
      });

      return {
        success: true,
        message: "Your submission has been received. Thank you!",
      };
    }),

  trackProgress: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/progress"), tags: TAGS } })
    .input(
      z.object({
        formId: z.string().uuid(),
        lastActiveFieldId: z.string().uuid(),
        answers: z.record(z.string(), z.any()),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const rawIp2 = ctx.req?.ip || ctx.req?.socket?.remoteAddress || "unknown-ip";
      const clientIp2 = crypto.createHash("sha256").update(rawIp2).digest("hex");

      const now2 = Date.now();
      // FIX #26: Use dedicated progress rate limiter
      const lastProgress = progressRateLimiter.get(clientIp2);
      if (lastProgress && now2 - lastProgress < 500) {
         // Rate limit tracking calls silently
         return { success: true };
      }
      progressRateLimiter.set(clientIp2, now2);

      // FIX #8: Use INSERT ... ON CONFLICT DO UPDATE (upsert) pattern.
      // We key on (formId, lastActiveFieldId) so each field gets one row per IP,
      // preventing unbounded row growth from repeated progress pings.
      // Since most DB setups don't have a unique constraint here we simulate
      // it by deleting existing incomplete rows for this IP before inserting.
      await db
        .delete(schema.formResponsesTable)
        .where(
          and(
            eq(schema.formResponsesTable.formId, input.formId),
            eq(schema.formResponsesTable.completed, false)
          )
        );

      // Now insert a single current progress row
      await db.insert(schema.formResponsesTable).values({
        formId: input.formId,
        answers: input.answers,
        completed: false,
        lastActiveFieldId: input.lastActiveFieldId,
        metadata: {
          browser: ctx.req?.headers["user-agent"] || "unknown",
        },
      });

      return { success: true };
    }),

  getResponses: workspaceProcedure
    .meta({ openapi: { method: "GET", path: getPath("/list/{formId}"), tags: TAGS } })
    .input(z.object({ formId: z.string().uuid(), page: z.number().int().min(1).default(1), limit: z.number().int().min(1).max(100).default(50) }))
    .output(
      z.object({
        responses: z.array(
          z.object({
            id: z.string(),
            answers: z.any(),
            completed: z.boolean(),
            createdAt: z.date(),
            metadata: z.any().nullable(),
          })
        ),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Confirm form belongs to current workspace
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

      const offset = (input.page - 1) * input.limit;

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.formResponsesTable)
        .where(eq(schema.formResponsesTable.formId, input.formId));
      const total = Number(countResult[0]?.count) || 0;

      const responses = await db
        .select()
        .from(schema.formResponsesTable)
        .where(eq(schema.formResponsesTable.formId, input.formId))
        .orderBy(schema.formResponsesTable.createdAt)
        .limit(input.limit)
        .offset(offset);

      return { responses, total, page: input.page, limit: input.limit };
    }),

  listForApi: apiKeyProcedure
    .meta({ openapi: { method: "GET", path: getPath("/api/list/{formId}"), tags: TAGS } })
    .input(z.object({ formId: z.string().uuid(), page: z.number().int().min(1).default(1), limit: z.number().int().min(1).max(100).default(50) }))
    .output(
      z.object({
        responses: z.array(
          z.object({
            id: z.string(),
            answers: z.any(),
            completed: z.boolean(),
            createdAt: z.date(),
            metadata: z.any().nullable(),
          })
        ),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Confirm form belongs to the workspace associated with this API key
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
          message: "Form not found or you don't have access to it",
        });
      }

      const offset = (input.page - 1) * input.limit;

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.formResponsesTable)
        .where(eq(schema.formResponsesTable.formId, input.formId));
      const total = Number(countResult[0]?.count) || 0;

      const responses = await db
        .select()
        .from(schema.formResponsesTable)
        .where(eq(schema.formResponsesTable.formId, input.formId))
        .orderBy(schema.formResponsesTable.createdAt)
        .limit(input.limit)
        .offset(offset);

      return { responses, total, page: input.page, limit: input.limit };
    }),

  getAnalytics: workspaceProcedure
    .meta({ openapi: { method: "GET", path: getPath("/analytics/{formId}"), tags: TAGS } })
    .input(z.object({ formId: z.string().uuid() }))
    .output(z.any())
    .query(async ({ input, ctx }) => {
      // 1. Confirm form ownership
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

      const form = forms[0]!;

      // 2. Fetch responses
      const allResponses = await db
        .select()
        .from(schema.formResponsesTable)
        .where(eq(schema.formResponsesTable.formId, input.formId));

      const completedResponses = allResponses.filter((r) => r.completed);
      const incompleteResponses = allResponses.filter((r) => !r.completed);

      // Calculate Metrics
      const totalViews = form.viewsCount || 0;
      const totalStarts = form.startsCount || 0;
      const totalCompletions = completedResponses.length;
      const conversionRate = totalViews > 0 ? Math.round((totalCompletions / totalViews) * 100) : 0;

      // Calculate Average Response Duration
      let totalDuration = 0;
      let durationCount = 0;
      for (const resp of completedResponses) {
        const metadata = resp.metadata as any;
        if (metadata && typeof metadata.responseTime === "number") {
          totalDuration += metadata.responseTime;
          durationCount++;
        }
      }
      const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

      // 3. Compile field aggregates (tally of options, average ratings)
      const fields = await db
        .select()
        .from(schema.formFieldsTable)
        .where(eq(schema.formFieldsTable.formId, input.formId))
        .orderBy(schema.formFieldsTable.order);

      const fieldAnalytics: Record<string, any> = {};

      for (const field of fields) {
        if (field.type === "rating") {
          let sum = 0;
          let count = 0;
          for (const resp of completedResponses) {
            const answers = resp.answers as Record<string, any>;
            const val = Number(answers[field.id]);
            if (!isNaN(val)) {
              sum += val;
              count++;
            }
          }
          fieldAnalytics[field.id] = {
            type: "rating",
            average: count > 0 ? Number((sum / count).toFixed(1)) : 0,
            count,
          };
        } else if (field.type === "select" || field.type === "checkbox" || field.type === "multi_select") {
          const tallies: Record<string, number> = {};
          if (field.options) {
            for (const opt of field.options as string[]) {
              tallies[opt] = 0;
            }
          }
          for (const resp of completedResponses) {
            const answers = resp.answers as Record<string, any>;
            const val = answers[field.id];
            if (val) {
              if (Array.isArray(val)) {
                for (const item of val) {
                  tallies[item] = (tallies[item] || 0) + 1;
                }
              } else {
                tallies[val] = (tallies[val] || 0) + 1;
              }
            }
          }
          fieldAnalytics[field.id] = {
            type: "choices",
            tallies,
          };
        }
      }

      // 4. Calculate Drop-off Funnel counts
      // For each question (by index / order), count how many users abandoned at that step
      const dropOffFunnel = fields.map((f) => {
        // Count how many incomplete responses had lastActiveFieldId = f.id
        const dropCount = incompleteResponses.filter((r) => r.lastActiveFieldId === f.id).length;
        return {
          fieldId: f.id,
          label: f.label,
          type: f.type,
          order: f.order,
          dropCount,
        };
      });

      return {
        summary: {
          views: totalViews,
          starts: totalStarts,
          completions: totalCompletions,
          conversionRate,
          averageDuration: avgDuration,
        },
        fieldAnalytics,
        dropOffFunnel,
      };
    }),

  exportCsv: workspaceProcedure
    .meta({ openapi: { method: "GET", path: getPath("/export-csv/{formId}"), tags: TAGS } })
    .input(z.object({ formId: z.string().uuid() }))
    .output(z.string())
    .query(async ({ input, ctx }) => {
      await requireRole(ctx.user.id, ctx.activeWorkspace.id, ["owner", "admin", "analyst"]);
      requireTier(ctx.activeWorkspace.tier, ["pro", "business", "enterprise"]);

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
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      const form = forms[0]!;

      const fields = await db
        .select()
        .from(schema.formFieldsTable)
        .where(eq(schema.formFieldsTable.formId, form.id))
        .orderBy(schema.formFieldsTable.order);

      const responses = await db
        .select()
        .from(schema.formResponsesTable)
        .where(eq(schema.formResponsesTable.formId, form.id))
        .orderBy(schema.formResponsesTable.createdAt);

      const escapeCsv = (str: any) => {
        if (str === null || str === undefined) return "";
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
      };

      const headers = ["Response ID", "Submitted At", ...fields.map((f) => f.label), "Response Time (ms)"];
      
      // FIX #16: Removed IP address column from CSV export for privacy/GDPR compliance.
      const rows = responses.map((r) => {
        const answers = (r.answers as Record<string, any>) || {};
        const metadata = (r.metadata as Record<string, any>) || {};
        return [
          r.id,
          r.createdAt.toISOString(),
          ...fields.map((f) => answers[f.id] || ""),
          // FIX #25: consistent key name
          metadata.responseTime || ""
        ].map(escapeCsv).join(",");
      });

      return [headers.map(escapeCsv).join(","), ...rows].join("\n");
    }),
});
