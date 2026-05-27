import { router, publicProcedure, protectedProcedure, workspaceProcedure } from "../../trpc";
import { z } from "zod";
import { db, eq, and, desc, asc, ilike, sql } from "@repo/database";
import * as schema from "@repo/database/schema";
import { TRPCError } from "@trpc/server";
import { requireRole } from "../../utils/rbac";

export const marketplaceRouter = router({
  listTemplates: publicProcedure
    .input(
      z.object({
        industry: z.string().optional(),
        search: z.string().optional(),
        workspaceTier: z.enum(["free", "pro", "business", "enterprise"]).optional(),
      })
    )
    .query(async ({ input }) => {
      let conditions = [];
      if (input.industry && input.industry !== "All") {
        conditions.push(eq(schema.templatesTable.industry, input.industry));
      }
      if (input.search) {
        const escapedSearch = input.search.replace(/[%_]/g, "\\$&");
        conditions.push(ilike(schema.templatesTable.title, `%${escapedSearch}%`));
      }

      const baseQuery = db
        .select({
          id: schema.templatesTable.id,
          title: schema.templatesTable.title,
          description: schema.templatesTable.description,
          industry: schema.templatesTable.industry,
          price: schema.templatesTable.price,
          coverImageUrl: schema.templatesTable.coverImageUrl,
          downloadsCount: schema.templatesTable.downloadsCount,
          isCurated: schema.templatesTable.isCurated,
          creatorId: schema.templatesTable.creatorId,
          theme: schema.templatesTable.theme,
          customThemeConfig: schema.templatesTable.customThemeConfig,
        })
        .from(schema.templatesTable);

      const filteredQuery = conditions.length > 0
        ? baseQuery.where(and(...conditions))
        : baseQuery;

      const templates = await filteredQuery.orderBy(desc(schema.templatesTable.downloadsCount));

      // Free tier: max 5 templates per industry (20 total)
      const isPaidTier = ["pro", "business", "enterprise"].includes(input.workspaceTier ?? "");
      if (!isPaidTier) {
        const FREE_LIMIT_PER_INDUSTRY = 5;
        const countByIndustry: Record<string, number> = {};
        return templates
          .map((t) => ({ ...t, locked: false }))
          .map((t) => {
            const ind = t.industry ?? "Other";
            countByIndustry[ind] = (countByIndustry[ind] ?? 0) + 1;
            const locked = countByIndustry[ind] > FREE_LIMIT_PER_INDUSTRY;
            return { ...t, locked };
          });
      }

      return templates.map((t) => ({ ...t, locked: false }));
    }),

  getTemplate: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const templates = await db
        .select()
        .from(schema.templatesTable)
        .where(eq(schema.templatesTable.id, input.id))
        .limit(1);

      const template = templates[0];
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      const fields = await db
        .select()
        .from(schema.templateFieldsTable)
        .where(eq(schema.templateFieldsTable.templateId, template.id))
        .orderBy(asc(schema.templateFieldsTable.order));

      return { template, fields };
    }),

  applyTemplate: workspaceProcedure
    .input(
      z.object({
        templateId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch template and fields
      const templates = await db
        .select()
        .from(schema.templatesTable)
        .where(eq(schema.templatesTable.id, input.templateId))
        .limit(1);
      
      const template = templates[0];
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      // Block applying locked templates for free tier
      const isPaidTier = ["pro", "business", "enterprise"].includes(ctx.activeWorkspace.tier);
      if (!isPaidTier) {
        // Count how many templates from this industry have been applied already
        // Simple rule: if template.price > 0 OR it's beyond the 5-per-industry limit, block it
        if (template.price && template.price > 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `This is a premium template. Please upgrade to Pro to use it.`,
          });
        }

        // Check if this template would be locked (beyond position 5 in its industry)
        const industryTemplates = await db
          .select({ id: schema.templatesTable.id })
          .from(schema.templatesTable)
          .where(eq(schema.templatesTable.industry, template.industry))
          .orderBy(desc(schema.templatesTable.downloadsCount));

        const position = industryTemplates.findIndex((t) => t.id === template.id);
        if (position >= 5) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Free plan includes only 5 templates per category. Upgrade to Pro to unlock all ${industryTemplates.length} templates in ${template.industry}.`,
          });
        }
      }

      // Block applying paid templates without an appropriate subscription (pro+ check for paid templates)
      if (template.price && template.price > 0) {
        const allowedPaidTiers = ["pro", "business", "enterprise"];
        if (!allowedPaidTiers.includes(ctx.activeWorkspace.tier)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `This is a premium template (₹${template.price}). Please upgrade to Pro or higher to use it.`,
          });
        }
      }

      const templateFields = await db
        .select()
        .from(schema.templateFieldsTable)
        .where(eq(schema.templateFieldsTable.templateId, template.id));

      // 2. Clone into Forms
      const newForms = await db
        .insert(schema.formsTable)
        .values({
          workspaceId: ctx.activeWorkspace.id,
          title: template.title,
          description: template.description,
          layoutType: template.layoutType,
          theme: template.theme,
          customThemeConfig: template.customThemeConfig,
          status: "draft",
          visibility: "public",
        })
        .returning();

      const newForm = newForms[0];
      if (!newForm) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create form" });
      }

      // 3. Clone fields
      if (templateFields.length > 0) {
        const fieldsToInsert = templateFields.map((f) => ({
          formId: newForm.id,
          type: f.type,
          label: f.label,
          placeholder: f.placeholder,
          required: f.required,
          order: f.order,
          options: f.options,
          validationRules: f.validationRules,
          conditionalLogic: f.conditionalLogic,
        }));
        await db.insert(schema.formFieldsTable).values(fieldsToInsert);
      }

      // 4. Increment downloads count
      await db
        .update(schema.templatesTable)
        .set({ downloadsCount: sql`${schema.templatesTable.downloadsCount} + 1` })
        .where(eq(schema.templatesTable.id, template.id));

      // 5. Audit Log
      await db.insert(schema.auditLogsTable).values({
        workspaceId: ctx.activeWorkspace.id,
        userId: ctx.user.id,
        action: "template_applied",
        details: `Created form from template: ${template.title}`,
      });

      return { formId: newForm.id };
    }),

  publishTemplate: workspaceProcedure
    .input(
      z.object({
        formId: z.string(),
        industry: z.string(),
        price: z.number().min(0),
        coverImageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireRole(ctx.user.id, ctx.activeWorkspace.id, ["owner", "admin"]);

      // 1. Fetch form
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

      const form = forms[0];
      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      const formFields = await db
        .select()
        .from(schema.formFieldsTable)
        .where(eq(schema.formFieldsTable.formId, form.id));

      // 2. Clone into Templates
      const newTemplates = await db
        .insert(schema.templatesTable)
        .values({
          creatorId: ctx.user.id,
          title: form.title,
          description: form.description,
          industry: input.industry,
          price: input.price,
          coverImageUrl: input.coverImageUrl,
          layoutType: form.layoutType,
          theme: form.theme,
          customThemeConfig: form.customThemeConfig,
          isCurated: false,
        })
        .returning();

      const newTemplate = newTemplates[0];
      if (!newTemplate) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create template" });
      }

      // 3. Clone fields
      if (formFields.length > 0) {
        const fieldsToInsert = formFields.map((f) => ({
          templateId: newTemplate.id,
          type: f.type,
          label: f.label,
          placeholder: f.placeholder,
          required: f.required,
          order: f.order,
          options: f.options,
          validationRules: f.validationRules,
          conditionalLogic: f.conditionalLogic,
        }));
        await db.insert(schema.templateFieldsTable).values(fieldsToInsert);
      }

      return { templateId: newTemplate.id };
    }),
});
