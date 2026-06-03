import { z, zodUndefinedModel } from "../../schema";
import { workspaceProcedure, publicProcedure, apiKeyProcedure, router, requireTier } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { db, eq, and, sql, desc } from "@repo/database";
import * as schema from "@repo/database/schema";
import { TRPCError } from "@trpc/server";
import { requireRole } from "../../utils/rbac";
import { hashPassword, verifyPassword } from "../../utils/password";
import crypto from "node:crypto";

// Rate limiter for public form page loads (max 1 per 2s per IP)
const publicFormRateLimiter = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  for (const [ip, time] of publicFormRateLimiter.entries()) {
    if (now - time > 10000) publicFormRateLimiter.delete(ip);
  }
}, 30000);

const TAGS = ["Forms"];
const getPath = generatePath("/forms");

export const formsRouter = router({
  list: workspaceProcedure
    .meta({ openapi: { method: "GET", path: getPath("/list"), tags: TAGS } })
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.number().min(0).default(0),
      }).optional().default({ limit: 50, cursor: 0 })
    )
    .output(
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            description: z.string().nullable(),
            status: z.string(),
            visibility: z.string(),
            layoutType: z.string(),
            theme: z.string(),
            customSlug: z.string().nullable(),
            viewsCount: z.number(),
            startsCount: z.number(),
            createdAt: z.date(),
          })
        ),
        nextCursor: z.number().nullable()
      })
    )
    .query(async ({ input, ctx }) => {
      const limit = input?.limit || 50;
      const cursor = input?.cursor || 0;

      const forms = await db
        .select()
        .from(schema.formsTable)
        .where(eq(schema.formsTable.workspaceId, ctx.activeWorkspace.id))
        .orderBy(desc(schema.formsTable.createdAt))
        .limit(limit + 1)
        .offset(cursor);

      let nextCursor: number | null = null;
      if (forms.length > limit) {
        forms.pop();
        nextCursor = cursor + limit;
      }

      return { items: forms, nextCursor };
    }),

  get: workspaceProcedure
    .meta({ openapi: { method: "GET", path: getPath("/get/{id}"), tags: TAGS } })
    .input(z.object({ id: z.string().uuid() }))
    .output(
      z.object({
        form: z.object({
          id: z.string(),
          title: z.string(),
          description: z.string().nullable(),
          status: z.string(),
          visibility: z.string(),
          layoutType: z.string(),
          theme: z.string(),
          customSlug: z.string().nullable(),
          password: z.string().nullable(),
          expiryDate: z.date().nullable(),
          responseLimit: z.number().nullable(),
          viewsCount: z.number(),
          startsCount: z.number(),
        }),
        fields: z.array(
          z.object({
            id: z.string(),
            type: z.string(),
            label: z.string(),
            placeholder: z.string().nullable(),
            required: z.boolean(),
            order: z.number(),
            options: z.array(z.string()).nullable(),
            validationRules: z.any().nullable(),
            conditionalLogic: z.any().nullable(),
          })
        ),
      })
    )
    .query(async ({ input, ctx }) => {
      const forms = await db
        .select()
        .from(schema.formsTable)
        .where(
          and(
            eq(schema.formsTable.id, input.id),
            eq(schema.formsTable.workspaceId, ctx.activeWorkspace.id)
          )
        )
        .limit(1);

      if (forms.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Form not found or access denied",
        });
      }

      const fields = await db
        .select()
        .from(schema.formFieldsTable)
        .where(eq(schema.formFieldsTable.formId, input.id))
        .orderBy(schema.formFieldsTable.order);

      // Parse JSONB types cleanly for TypeScript outputs
      const parsedFields = fields.map((f) => ({
        id: f.id,
        type: f.type,
        label: f.label,
        placeholder: f.placeholder,
        required: f.required,
        order: f.order,
        options: f.options as string[] | null,
        validationRules: f.validationRules,
        conditionalLogic: f.conditionalLogic,
      }));

      return {
        form: forms[0]!,
        fields: parsedFields,
      };
    }),

  create: workspaceProcedure
    .meta({ openapi: { method: "POST", path: getPath("/create"), tags: TAGS } })
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(5000).optional(),
        theme: z.string().max(50).default("default"),
        layoutType: z.string().max(50).default("conversational"),
      })
    )
    .output(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const newFormResult = await db
        .insert(schema.formsTable)
        .values({
          workspaceId: ctx.activeWorkspace.id,
          title: input.title,
          description: input.description || null,
          theme: input.theme,
          layoutType: input.layoutType,
          status: "draft",
          visibility: "public",
        })
        .returning();
      const newForm = newFormResult[0]!;

      // Create a default first field so it's not empty
      await db.insert(schema.formFieldsTable).values({
        formId: newForm.id,
        type: "short_text",
        label: "Welcome to our form! What is your name?",
        required: true,
        order: 1,
      });

      // Audit log
      await db.insert(schema.auditLogsTable).values({
        workspaceId: ctx.activeWorkspace.id,
        userId: ctx.user.id,
        action: "form_created",
        details: `Created form: ${newForm.title}`,
      });

      return {
        id: newForm.id,
        title: newForm.title,
        description: newForm.description,
      };
    }),

  createFromTemplate: workspaceProcedure
    .meta({ openapi: { method: "POST", path: getPath("/create-from-template"), tags: TAGS } })
    .input(z.object({ templateId: z.string() }))
    .output(z.object({ id: z.string(), title: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // ── TEMPLATE DEFINITIONS ──────────────────────────────────────────────
      // Each entry: title, description, theme, layoutType, fields[]
      const TEMPLATE_MAP: Record<string, {
        title: string;
        description: string;
        theme: string;
        layoutType: string;
        fields: Array<{ type: string; label: string; placeholder?: string; required: boolean; order: number; options?: string[] }>;
      }> = {
        // ── HEALTHCARE ──
        "hc-1": {
          title: "Patient Intake Form", description: "Collect patient demographics and medical history before their first visit.",
          theme: "healthcare", layoutType: "classic",
          fields: [
            { type: "short_text", label: "Full Legal Name", placeholder: "e.g. John Michael Smith", required: true, order: 1 },
            { type: "date", label: "Date of Birth", required: true, order: 2 },
            { type: "select", label: "Biological Sex", required: true, order: 3, options: ["Male", "Female", "Prefer not to say"] },
            { type: "short_text", label: "Phone Number", placeholder: "+1 (555) 000-0000", required: true, order: 4 },
            { type: "email", label: "Email Address", placeholder: "patient@email.com", required: true, order: 5 },
            { type: "short_text", label: "Insurance Provider", placeholder: "e.g. BlueCross BlueShield", required: false, order: 6 },
            { type: "short_text", label: "Insurance Member ID", required: false, order: 7 },
            { type: "long_text", label: "Current Medications", placeholder: "List all medications and dosages...", required: false, order: 8 },
            { type: "long_text", label: "Known Allergies", placeholder: "e.g. Penicillin, Sulfa drugs...", required: false, order: 9 },
            { type: "checkbox", label: "Existing Conditions", required: false, order: 10, options: ["Diabetes", "Hypertension", "Heart Disease", "Asthma", "None"] },
            { type: "short_text", label: "Emergency Contact Name", required: true, order: 11 },
            { type: "short_text", label: "Emergency Contact Phone", required: true, order: 12 },
          ],
        },
        "hc-2": {
          title: "Appointment Request", description: "Let patients request appointments by date, time, and department.",
          theme: "healthcare", layoutType: "conversational",
          fields: [
            { type: "short_text", label: "Your Full Name", required: true, order: 1 },
            { type: "email", label: "Email Address", required: true, order: 2 },
            { type: "short_text", label: "Phone Number", required: true, order: 3 },
            { type: "select", label: "Department / Specialty", required: true, order: 4, options: ["General Practice", "Cardiology", "Dermatology", "Orthopedics", "Pediatrics", "Neurology"] },
            { type: "date", label: "Preferred Appointment Date", required: true, order: 5 },
            { type: "select", label: "Preferred Time Slot", required: true, order: 6, options: ["Morning (8am–12pm)", "Afternoon (12pm–4pm)", "Evening (4pm–7pm)"] },
            { type: "long_text", label: "Reason for Visit", placeholder: "Briefly describe your symptoms or concern...", required: true, order: 7 },
            { type: "select", label: "Is this a new or returning patient?", required: true, order: 8, options: ["New Patient", "Returning Patient"] },
          ],
        },
        "hc-6": {
          title: "Patient Satisfaction Survey", description: "Measure patient experience across wait times, staff, and care quality.",
          theme: "healthcare", layoutType: "conversational",
          fields: [
            { type: "rating", label: "How would you rate your overall experience?", required: true, order: 1 },
            { type: "rating", label: "How satisfied were you with the wait time?", required: true, order: 2 },
            { type: "rating", label: "How would you rate the friendliness of our staff?", required: true, order: 3 },
            { type: "rating", label: "How clearly did the doctor explain your condition?", required: true, order: 4 },
            { type: "select", label: "Would you recommend us to others?", required: true, order: 5, options: ["Definitely Yes", "Probably Yes", "Not Sure", "Probably Not", "Definitely Not"] },
            { type: "long_text", label: "Do you have any additional comments or suggestions?", required: false, order: 6 },
          ],
        },
        // ── EDUCATION ──
        "ed-1": {
          title: "Student Enrollment", description: "New student enrollment with academic records and guardian information.",
          theme: "education", layoutType: "classic",
          fields: [
            { type: "short_text", label: "Student Full Name", required: true, order: 1 },
            { type: "date", label: "Date of Birth", required: true, order: 2 },
            { type: "short_text", label: "Grade / Year Applying For", required: true, order: 3 },
            { type: "email", label: "Parent/Guardian Email", required: true, order: 4 },
            { type: "short_text", label: "Parent/Guardian Phone", required: true, order: 5 },
            { type: "short_text", label: "Previous School Name", required: false, order: 6 },
            { type: "select", label: "Previous Academic Performance", required: false, order: 7, options: ["Excellent (A)", "Good (B)", "Average (C)", "Below Average"] },
            { type: "checkbox", label: "Extracurricular Interests", required: false, order: 8, options: ["Sports", "Music", "Art", "Science Club", "Debate", "Drama"] },
            { type: "long_text", label: "Any special educational needs or accommodations required?", required: false, order: 9 },
          ],
        },
        "ed-2": {
          title: "Course Evaluation", description: "End-of-semester feedback covering teaching quality and content.",
          theme: "education", layoutType: "conversational",
          fields: [
            { type: "short_text", label: "Course Name / Code", required: true, order: 1 },
            { type: "short_text", label: "Instructor Name", required: true, order: 2 },
            { type: "rating", label: "Rate the overall quality of this course", required: true, order: 3 },
            { type: "rating", label: "Rate the instructor's teaching effectiveness", required: true, order: 4 },
            { type: "select", label: "Was the course material clearly organized?", required: true, order: 5, options: ["Very Clear", "Mostly Clear", "Somewhat Unclear", "Very Unclear"] },
            { type: "rating", label: "Rate the workload and pacing of this course", required: true, order: 6 },
            { type: "long_text", label: "What did you enjoy most about this course?", required: false, order: 7 },
            { type: "long_text", label: "What would you improve about this course?", required: false, order: 8 },
          ],
        },
        // ── MARKETING ──
        "mk-1": {
          title: "Lead Capture Form", description: "High-converting lead gen form with name, email, company, and interest area.",
          theme: "marketing", layoutType: "conversational",
          fields: [
            { type: "short_text", label: "What's your name?", placeholder: "First and last name", required: true, order: 1 },
            { type: "email", label: "Work email address", placeholder: "you@company.com", required: true, order: 2 },
            { type: "short_text", label: "Company name", placeholder: "e.g. Acme Inc.", required: true, order: 3 },
            { type: "select", label: "Company size", required: true, order: 4, options: ["1–10", "11–50", "51–200", "201–1000", "1000+"] },
            { type: "select", label: "What are you most interested in?", required: true, order: 5, options: ["Growing Revenue", "Automating Workflows", "Better Analytics", "Team Collaboration", "Customer Retention"] },
            { type: "select", label: "How soon are you looking to get started?", required: false, order: 6, options: ["Immediately", "Within 1 month", "1–3 months", "Just exploring"] },
          ],
        },
        "mk-2": {
          title: "Webinar Registration", description: "Register attendees for upcoming webinars with session preferences.",
          theme: "marketing", layoutType: "conversational",
          fields: [
            { type: "short_text", label: "Your Full Name", required: true, order: 1 },
            { type: "email", label: "Email Address", placeholder: "you@company.com", required: true, order: 2 },
            { type: "short_text", label: "Job Title", required: false, order: 3 },
            { type: "short_text", label: "Company", required: false, order: 4 },
            { type: "select", label: "Which session will you attend?", required: true, order: 5, options: ["Session 1: 10am EST", "Session 2: 2pm EST", "Session 3: 6pm EST"] },
            { type: "long_text", label: "Any questions you'd like us to cover?", required: false, order: 6 },
          ],
        },
        // ── HR ──
        "hr-1": {
          title: "Job Application Form", description: "Comprehensive job application collecting background, skills, and work history.",
          theme: "corporate", layoutType: "classic",
          fields: [
            { type: "short_text", label: "Full Name", required: true, order: 1 },
            { type: "email", label: "Email Address", required: true, order: 2 },
            { type: "short_text", label: "Phone Number", required: true, order: 3 },
            { type: "short_text", label: "Position Applying For", required: true, order: 4 },
            { type: "select", label: "Years of Experience", required: true, order: 5, options: ["0–1 years", "1–3 years", "3–5 years", "5–10 years", "10+ years"] },
            { type: "short_text", label: "LinkedIn Profile URL", required: false, order: 6 },
            { type: "short_text", label: "Portfolio / GitHub URL", required: false, order: 7 },
            { type: "long_text", label: "Why do you want to work here?", required: true, order: 8 },
            { type: "long_text", label: "Describe your most relevant experience", required: true, order: 9 },
            { type: "select", label: "Expected Start Date", required: false, order: 10, options: ["Immediately", "2 weeks", "1 month", "More than 1 month"] },
          ],
        },
        // ── ECOMMERCE ──
        "ec-1": {
          title: "Product Return Request", description: "Streamlined return and refund request form for e-commerce stores.",
          theme: "ecommerce", layoutType: "classic",
          fields: [
            { type: "short_text", label: "Order Number", placeholder: "#12345", required: true, order: 1 },
            { type: "email", label: "Email Address Used at Purchase", required: true, order: 2 },
            { type: "short_text", label: "Product Name", required: true, order: 3 },
            { type: "select", label: "Reason for Return", required: true, order: 4, options: ["Wrong item received", "Item damaged/defective", "Changed my mind", "Item not as described", "Sizing issue"] },
            { type: "select", label: "Preferred Resolution", required: true, order: 5, options: ["Full Refund", "Exchange for Same Item", "Store Credit"] },
            { type: "long_text", label: "Additional details about the issue", required: false, order: 6 },
          ],
        },
        "ec-2": {
          title: "Customer Feedback Survey", description: "Post-purchase survey to measure satisfaction and gather product insights.",
          theme: "ecommerce", layoutType: "conversational",
          fields: [
            { type: "short_text", label: "What product did you purchase?", required: true, order: 1 },
            { type: "rating", label: "How would you rate your overall purchase experience?", required: true, order: 2 },
            { type: "rating", label: "How satisfied are you with the product quality?", required: true, order: 3 },
            { type: "select", label: "How did you hear about us?", required: false, order: 4, options: ["Social Media", "Google Search", "Friend Recommendation", "Email", "Advertisement"] },
            { type: "select", label: "Would you shop with us again?", required: true, order: 5, options: ["Definitely Yes", "Probably Yes", "Not Sure", "Probably Not"] },
            { type: "long_text", label: "Any other feedback for us?", required: false, order: 6 },
          ],
        },
        // ── REAL ESTATE ──
        "re-1": {
          title: "Property Inquiry Form", description: "Capture buyer or renter inquiries with property preferences and budget.",
          theme: "real_estate", layoutType: "classic",
          fields: [
            { type: "short_text", label: "Full Name", required: true, order: 1 },
            { type: "email", label: "Email Address", required: true, order: 2 },
            { type: "short_text", label: "Phone Number", required: true, order: 3 },
            { type: "select", label: "Are you looking to Buy or Rent?", required: true, order: 4, options: ["Buy", "Rent", "Both"] },
            { type: "select", label: "Property Type", required: true, order: 5, options: ["Apartment", "House", "Condo", "Townhouse", "Commercial", "Land"] },
            { type: "select", label: "Budget Range", required: true, order: 6, options: ["Under $200K", "$200K–$500K", "$500K–$1M", "$1M–$2M", "$2M+"] },
            { type: "number", label: "Preferred number of bedrooms", required: false, order: 7 },
            { type: "select", label: "Preferred Move-in Timeline", required: false, order: 8, options: ["ASAP", "1–3 months", "3–6 months", "6+ months"] },
            { type: "long_text", label: "Any specific requirements or preferences?", required: false, order: 9 },
          ],
        },
        // ── FINANCE ──
        "fi-1": {
          title: "Loan Pre-Qualification", description: "Collect financial information for mortgage or personal loan pre-qualification.",
          theme: "finance", layoutType: "classic",
          fields: [
            { type: "short_text", label: "Full Legal Name", required: true, order: 1 },
            { type: "email", label: "Email Address", required: true, order: 2 },
            { type: "short_text", label: "Phone Number", required: true, order: 3 },
            { type: "select", label: "Loan Type", required: true, order: 4, options: ["Home Mortgage", "Auto Loan", "Personal Loan", "Business Loan", "Student Loan"] },
            { type: "number", label: "Requested Loan Amount ($)", required: true, order: 5 },
            { type: "select", label: "Employment Status", required: true, order: 6, options: ["Employed Full-Time", "Employed Part-Time", "Self-Employed", "Retired", "Unemployed"] },
            { type: "number", label: "Annual Income ($)", required: true, order: 7 },
            { type: "select", label: "Credit Score Range (Estimate)", required: false, order: 8, options: ["Excellent (750+)", "Good (700–749)", "Fair (650–699)", "Poor (Below 650)", "Unknown"] },
            { type: "long_text", label: "Additional notes or questions", required: false, order: 9 },
          ],
        },
        // ── TECHNOLOGY ──
        "tech-1": {
          title: "Bug Report Form", description: "Structured bug report template for software development teams.",
          theme: "technology", layoutType: "classic",
          fields: [
            { type: "short_text", label: "Issue Title", placeholder: "Brief summary of the bug", required: true, order: 1 },
            { type: "select", label: "Severity", required: true, order: 2, options: ["Critical — System down", "High — Major feature broken", "Medium — Feature degraded", "Low — Minor issue"] },
            { type: "select", label: "Environment", required: true, order: 3, options: ["Production", "Staging", "Development", "Local"] },
            { type: "short_text", label: "Browser / OS / Device", placeholder: "e.g. Chrome 124, Windows 11", required: true, order: 4 },
            { type: "short_text", label: "App Version", required: false, order: 5 },
            { type: "long_text", label: "Steps to Reproduce", placeholder: "1. Go to...\n2. Click on...\n3. Observe...", required: true, order: 6 },
            { type: "long_text", label: "Expected Behavior", required: true, order: 7 },
            { type: "long_text", label: "Actual Behavior", required: true, order: 8 },
            { type: "email", label: "Your Email (for follow-up)", required: false, order: 9 },
          ],
        },
        // ── EVENTS / HOSPITALITY ──
        "ev-1": {
          title: "Event RSVP Form", description: "Collect RSVPs for corporate or social events with meal and session preferences.",
          theme: "hospitality", layoutType: "conversational",
          fields: [
            { type: "short_text", label: "Your Full Name", required: true, order: 1 },
            { type: "email", label: "Email Address", required: true, order: 2 },
            { type: "select", label: "Will you be attending?", required: true, order: 3, options: ["Yes, I'll be there!", "No, I can't make it", "Maybe"] },
            { type: "number", label: "Number of guests attending (including yourself)", required: true, order: 4 },
            { type: "select", label: "Meal Preference", required: false, order: 5, options: ["Standard", "Vegetarian", "Vegan", "Gluten-Free", "Halal", "Kosher"] },
            { type: "long_text", label: "Any dietary restrictions or special requests?", required: false, order: 6 },
          ],
        },
        // ── LEGAL ──
        "lg-1": {
          title: "Client Intake Form", description: "Initial client intake form for law firms covering case details and objectives.",
          theme: "corporate", layoutType: "classic",
          fields: [
            { type: "short_text", label: "Client Full Name", required: true, order: 1 },
            { type: "email", label: "Email Address", required: true, order: 2 },
            { type: "short_text", label: "Phone Number", required: true, order: 3 },
            { type: "select", label: "Area of Law", required: true, order: 4, options: ["Family Law", "Criminal Defense", "Corporate Law", "Real Estate", "Immigration", "Employment", "Personal Injury", "Other"] },
            { type: "long_text", label: "Briefly describe your legal situation", required: true, order: 5 },
            { type: "date", label: "When did the incident / issue occur?", required: false, order: 6 },
            { type: "select", label: "Have you consulted another attorney about this matter?", required: false, order: 7, options: ["Yes", "No"] },
            { type: "long_text", label: "What outcome are you hoping to achieve?", required: false, order: 8 },
          ],
        },
        // ── NONPROFIT ──
        "np-1": {
          title: "Volunteer Application", description: "Recruit volunteers with skills, availability, and motivation.",
          theme: "minimalist", layoutType: "classic",
          fields: [
            { type: "short_text", label: "Full Name", required: true, order: 1 },
            { type: "email", label: "Email Address", required: true, order: 2 },
            { type: "short_text", label: "Phone Number", required: false, order: 3 },
            { type: "checkbox", label: "Areas of Interest", required: true, order: 4, options: ["Community Outreach", "Event Planning", "Fundraising", "Administrative Support", "Social Media", "Teaching / Tutoring"] },
            { type: "select", label: "Hours available per week", required: true, order: 5, options: ["1–5 hours", "5–10 hours", "10–20 hours", "20+ hours"] },
            { type: "checkbox", label: "Days available", required: true, order: 6, options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
            { type: "long_text", label: "Why do you want to volunteer with us?", required: true, order: 7 },
            { type: "long_text", label: "Any relevant skills or experience?", required: false, order: 8 },
          ],
        },
        // ── FITNESS ──
        "fit-1": {
          title: "Gym Membership Application", description: "New member sign-up with fitness goals, health history, and plan selection.",
          theme: "marketing", layoutType: "conversational",
          fields: [
            { type: "short_text", label: "Your Full Name", required: true, order: 1 },
            { type: "email", label: "Email Address", required: true, order: 2 },
            { type: "short_text", label: "Phone Number", required: true, order: 3 },
            { type: "date", label: "Date of Birth", required: true, order: 4 },
            { type: "select", label: "Membership Plan", required: true, order: 5, options: ["Basic — $29/mo", "Standard — $49/mo", "Premium — $79/mo", "Family — $99/mo"] },
            { type: "checkbox", label: "Your fitness goals", required: true, order: 6, options: ["Lose Weight", "Build Muscle", "Improve Endurance", "Increase Flexibility", "General Health", "Sports Performance"] },
            { type: "select", label: "Have you had any injuries in the past 12 months?", required: true, order: 7, options: ["Yes", "No"] },
            { type: "long_text", label: "Describe any injuries or health conditions we should know about", required: false, order: 8 },
          ],
        },
        // ── RESTAURANT ──
        "rst-1": {
          title: "Table Reservation Form", description: "Online table booking with party size, date, and special requests.",
          theme: "hospitality", layoutType: "conversational",
          fields: [
            { type: "short_text", label: "Your Name", required: true, order: 1 },
            { type: "short_text", label: "Phone Number", required: true, order: 2 },
            { type: "email", label: "Email Address", required: true, order: 3 },
            { type: "number", label: "Number of guests", required: true, order: 4 },
            { type: "date", label: "Preferred Date", required: true, order: 5 },
            { type: "select", label: "Preferred Time", required: true, order: 6, options: ["12:00 PM", "1:00 PM", "2:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM"] },
            { type: "select", label: "Occasion", required: false, order: 7, options: ["Birthday", "Anniversary", "Business Dinner", "Date Night", "Family Gathering", "Other"] },
            { type: "long_text", label: "Special requests or dietary needs", required: false, order: 8 },
          ],
        },
        // ── CONSTRUCTION ──
        "con-1": {
          title: "Project Quote Request", description: "Capture construction project details and requirements for accurate quoting.",
          theme: "corporate", layoutType: "classic",
          fields: [
            { type: "short_text", label: "Client Name / Company", required: true, order: 1 },
            { type: "email", label: "Email Address", required: true, order: 2 },
            { type: "short_text", label: "Phone Number", required: true, order: 3 },
            { type: "select", label: "Project Type", required: true, order: 4, options: ["New Construction", "Renovation / Remodel", "Addition", "Repair", "Commercial Build-Out", "Other"] },
            { type: "short_text", label: "Project Location / Address", required: true, order: 5 },
            { type: "select", label: "Approximate Budget", required: true, order: 6, options: ["Under $10K", "$10K–$50K", "$50K–$200K", "$200K–$500K", "$500K+"] },
            { type: "date", label: "Desired Start Date", required: false, order: 7 },
            { type: "long_text", label: "Project Description & Scope of Work", required: true, order: 8 },
          ],
        },
        // ── TRAVEL ──
        "tr-1": {
          title: "Travel Booking Inquiry", description: "Capture travel preferences for custom vacation or business trip planning.",
          theme: "hospitality", layoutType: "conversational",
          fields: [
            { type: "short_text", label: "Full Name", required: true, order: 1 },
            { type: "email", label: "Email Address", required: true, order: 2 },
            { type: "short_text", label: "Phone Number", required: false, order: 3 },
            { type: "short_text", label: "Destination(s) of Interest", required: true, order: 4 },
            { type: "date", label: "Departure Date", required: true, order: 5 },
            { type: "number", label: "Number of Travelers", required: true, order: 6 },
            { type: "select", label: "Trip Type", required: true, order: 7, options: ["Family Vacation", "Honeymoon", "Solo Adventure", "Business Travel", "Group Tour"] },
            { type: "select", label: "Accommodation Preference", required: false, order: 8, options: ["Budget / Hostel", "3-Star Hotel", "4-Star Hotel", "5-Star / Luxury Resort", "Airbnb / Villa"] },
            { type: "select", label: "Budget Per Person (USD)", required: false, order: 9, options: ["Under $1,000", "$1,000–$3,000", "$3,000–$7,000", "$7,000+"] },
            { type: "long_text", label: "Any special requests or must-have experiences?", required: false, order: 10 },
          ],
        },
      };

      // Fallback for unknown template IDs
      const tpl = TEMPLATE_MAP[input.templateId] ?? {
        title: "Custom Form",
        description: "A new form created from a template.",
        theme: "default",
        layoutType: "conversational",
        fields: [
          { type: "short_text", label: "Your Name", required: true, order: 1 },
          { type: "email", label: "Your Email", required: true, order: 2 },
          { type: "long_text", label: "Your Message", required: true, order: 3 },
        ],
      };

      const newFormResult = await db
        .insert(schema.formsTable)
        .values({
          workspaceId: ctx.activeWorkspace.id,
          title: tpl.title,
          description: tpl.description,
          theme: tpl.theme,
          layoutType: tpl.layoutType,
          status: "draft",
          visibility: "public",
        })
        .returning();
      const newForm = newFormResult[0]!;

      if (tpl.fields.length > 0) {
        await db.insert(schema.formFieldsTable).values(
          tpl.fields.map((field) => ({
            formId: newForm.id,
            type: field.type,
            label: field.label,
            placeholder: field.placeholder || null,
            required: field.required,
            order: field.order,
            options: field.options || null,
          }))
        );
      }

      await db.insert(schema.auditLogsTable).values({
        workspaceId: ctx.activeWorkspace.id,
        userId: ctx.user.id,
        action: "form_created",
        details: `Created form from template "${input.templateId}": ${newForm.title}`,
      });

      return { id: newForm.id, title: newForm.title };
    }),

  generateAiForm: workspaceProcedure
    .meta({ openapi: { method: "POST", path: getPath("/generate-ai"), tags: TAGS } })
    .input(z.object({ prompt: z.string().min(3).max(500) }))
    .output(
      z.object({
        id: z.string(),
        title: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // NOTE: This is a keyword-based "Smart Template" generator, not a real AI/LLM.
      // FIX #11: Removed the pro-tier gate since this feature is not truly AI-powered.
      // If a real LLM is integrated in the future, the tier gate can be re-added.
      const prompt = input.prompt.toLowerCase();
      let generatedFields: Array<any> = [];
      let theme = "default";
      let title = "AI Generated Form";
      let description = `Generated via prompt: "${input.prompt}"`;

      if (prompt.includes("movie") || prompt.includes("cinema") || prompt.includes("film")) {
        title = "Movie & Cinema Feedback";
        theme = "cyberpunk";
        generatedFields = [
          { type: "short_text", label: "What is your favorite movie?", required: true, order: 1 },
          { type: "select", label: "Which genre do you watch the most?", required: true, order: 2, options: ["Action", "Sci-Fi", "Comedy", "Drama"] },
          { type: "rating", label: "Rate your movie theater experience (1-5)", required: false, order: 3 },
        ];
      } else if (prompt.includes("game") || prompt.includes("gaming") || prompt.includes("play")) {
        title = "Gaming Experience Poll";
        theme = "retro";
        generatedFields = [
          { type: "short_text", label: "What is your favorite video game?", required: true, order: 1 },
          { type: "select", label: "How many hours do you play per week?", required: true, order: 2, options: ["1-5 hours", "6-15 hours", "15+ hours"] },
          { type: "rating", label: "Rate the difficulty of your current game", required: false, order: 3 },
          { type: "checkbox", label: "Which gaming platforms do you own?", required: false, options: ["PC", "PlayStation", "Xbox", "Nintendo Switch"], order: 4 },
        ];
      } else if (prompt.includes("startup") || prompt.includes("pitch") || prompt.includes("business")) {
        title = "Startup Feedback Form";
        theme = "glassmorphism";
        generatedFields = [
          { type: "email", label: "Your work email address", required: true, order: 1 },
          { type: "number", label: "Company size (number of employees)", required: true, order: 2 },
          { type: "long_text", label: "Describe your biggest business bottleneck", required: true, order: 3 },
        ];
      } else {
        title = "General Customer Feedback";
        theme = "default";
        generatedFields = [
          { type: "short_text", label: "Your Name", required: true, order: 1 },
          { type: "email", label: "Your Email Address", required: true, order: 2 },
          { type: "long_text", label: "Your detailed feedback", required: true, order: 3 },
          { type: "rating", label: "Rate our service", required: false, order: 4 },
        ];
      }

      const newFormResult2 = await db
        .insert(schema.formsTable)
        .values({
          workspaceId: ctx.activeWorkspace.id,
          title,
          description,
          theme,
          layoutType: "conversational",
          status: "published",
          visibility: "public",
        })
        .returning();
      const newForm = newFormResult2[0]!;

      // Insert all generated fields
      if (generatedFields.length > 0) {
        await db.insert(schema.formFieldsTable).values(
          generatedFields.map((field: any) => ({
            formId: newForm.id,
            type: field.type,
            label: field.label,
            required: field.required,
            options: field.options || null,
            order: field.order,
          }))
        );
      }

      return {
        id: newForm.id,
        title: newForm.title,
      };
    }),

  update: workspaceProcedure
    .meta({ openapi: { method: "PUT", path: getPath("/update/{id}"), tags: TAGS } })
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1),
        description: z.string().nullable().optional(),
        status: z.enum(["draft", "published", "unpublished"]),
        visibility: z.enum(["public", "unlisted"]),
        layoutType: z.enum(["conversational", "classic"]),
        theme: z.string(),
        customSlug: z.string().nullable().optional(),
        password: z.string().nullable().optional(),
        expiryDate: z.coerce.date().nullable().optional(),
        responseLimit: z.number().nullable().optional(),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx.user.id, ctx.activeWorkspace.id, ["owner", "admin", "editor"]);

      // Enforce Pro Features
      if (input.theme && input.theme !== "default" && input.theme !== "ecommerce_1") {
        requireTier(ctx.activeWorkspace.tier, ["pro", "business", "enterprise"]);
      }
      if (input.layoutType && input.layoutType !== "conversational") {
        requireTier(ctx.activeWorkspace.tier, ["pro", "business", "enterprise"]);
      }

      // Enforce Enterprise Features
      if (input.password && input.password.trim() !== "") {
        requireTier(ctx.activeWorkspace.tier, ["business", "enterprise"]);
      }
      if (input.expiryDate) {
        requireTier(ctx.activeWorkspace.tier, ["business", "enterprise"]);
      }

      // Validate Custom Slug unique constraint
      if (input.customSlug) {
        const slugMatch = await db
          .select()
          .from(schema.formsTable)
          .where(and(eq(schema.formsTable.customSlug, input.customSlug), eq(schema.formsTable.workspaceId, ctx.activeWorkspace.id)));
        if (slugMatch.length > 0 && slugMatch[0]!.id !== input.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Custom link slug is already taken.",
          });
        }
      }

      const result = await db
        .update(schema.formsTable)
        .set({
          title: input.title,
          description: input.description,
          status: input.status,
          visibility: input.visibility,
          layoutType: input.layoutType,
          theme: input.theme,
          customSlug: input.customSlug || null,
          password: input.password !== undefined ? (input.password ? hashPassword(input.password) : null) : undefined,
          expiryDate: input.expiryDate || null,
          responseLimit: input.responseLimit || null,
        })
        .where(
          and(
            eq(schema.formsTable.id, input.id),
            eq(schema.formsTable.workspaceId, ctx.activeWorkspace.id)
          )
        );

      return { success: true };
    }),

  delete: workspaceProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/delete/{id}"), tags: TAGS } })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx.user.id, ctx.activeWorkspace.id, ["owner", "admin", "editor"]);

      await db
        .delete(schema.formsTable)
        .where(
          and(
            eq(schema.formsTable.id, input.id),
            eq(schema.formsTable.workspaceId, ctx.activeWorkspace.id)
          )
        );

      // Audit log
      await db.insert(schema.auditLogsTable).values({
        workspaceId: ctx.activeWorkspace.id,
        userId: ctx.user.id,
        action: "form_deleted",
        details: `Deleted form: ${input.id}`,
      });

      return { success: true };
    }),

  updateFields: workspaceProcedure
    .meta({ openapi: { method: "PUT", path: getPath("/fields/{formId}"), tags: TAGS } })
    .input(
      z.object({
        formId: z.string().uuid(),
        fields: z.array(
          z.object({
            id: z.string().optional(), // If empty, it's a new field
            type: z.string(),
            label: z.string(),
            placeholder: z.string().nullable().optional(),
            required: z.boolean(),
            order: z.number(),
            options: z.array(z.string()).nullable().optional(),
            validationRules: z.any().nullable().optional(),
            conditionalLogic: z.any().nullable().optional(),
          })
        ),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      // First verify form belongs to active workspace
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

      // Enforce Enterprise tier for conditional logic
      const hasConditionalLogic = input.fields.some(f => 
        f.conditionalLogic && Object.keys(f.conditionalLogic).length > 0
      );
      if (hasConditionalLogic) {
        requireTier(ctx.activeWorkspace.tier, ["business", "enterprise"]);
      }

      await db.transaction(async (tx) => {
        // We will clear existing fields and re-insert them to preserve orders & IDs cleanly
        await tx.delete(schema.formFieldsTable).where(eq(schema.formFieldsTable.formId, input.formId));

        if (input.fields.length > 0) {
          await tx.insert(schema.formFieldsTable).values(
            input.fields.map((field) => ({
              id: field.id || undefined,
              formId: input.formId,
              type: field.type,
              label: field.label,
              placeholder: field.placeholder || null,
              required: field.required,
              order: field.order,
              options: field.options || null,
              validationRules: field.validationRules || null,
              conditionalLogic: field.conditionalLogic || null,
            }))
          );
        }
      });

      return { success: true };
    }),

  getPublicForm: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/public/{idOrSlug}"), tags: TAGS } })
    .input(z.object({ idOrSlug: z.string(), password: z.string().optional() }))
    .output(
      z.object({
        form: z.object({
          id: z.string(),
          title: z.string(),
          description: z.string().nullable(),
          theme: z.string(),
          customThemeConfig: z.any().nullable(),
          layoutType: z.string(),
          removeBranding: z.boolean(),
          isPasswordProtected: z.boolean(),
          isExpired: z.boolean(),
          isLimitReached: z.boolean(),
        }),
        fields: z.array(
          z.object({
            id: z.string(),
            type: z.string(),
            label: z.string(),
            placeholder: z.string().nullable(),
            required: z.boolean(),
            order: z.number(),
            options: z.array(z.string()).nullable(),
            validationRules: z.any().nullable(),
            conditionalLogic: z.any().nullable(),
          })
        ),
      })
    )
    .query(async ({ input, ctx }) => {
      // FIX #21: Rate limit public form loads to prevent DoS / view inflation
      const rawIp = ctx.req?.ip || ctx.req?.socket?.remoteAddress || "unknown";
      const hashedIp = crypto.createHash("sha256").update(rawIp).digest("hex");
      const now = Date.now();
      const lastLoad = publicFormRateLimiter.get(hashedIp);
      if (lastLoad && now - lastLoad < 2000) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please slow down." });
      }
      publicFormRateLimiter.set(hashedIp, now);

      let forms = [];

      // Query by ID (if UUID format) or customSlug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.idOrSlug);
      
      if (isUuid) {
        forms = await db
          .select({
            form: schema.formsTable,
            workspace: schema.workspacesTable,
          })
          .from(schema.formsTable)
          .innerJoin(schema.workspacesTable, eq(schema.workspacesTable.id, schema.formsTable.workspaceId))
          .where(eq(schema.formsTable.id, input.idOrSlug))
          .limit(1);
      } else {
        forms = await db
          .select({
            form: schema.formsTable,
            workspace: schema.workspacesTable,
          })
          .from(schema.formsTable)
          .innerJoin(schema.workspacesTable, eq(schema.workspacesTable.id, schema.formsTable.workspaceId))
          .where(eq(schema.formsTable.customSlug, input.idOrSlug))
          .limit(1);
      }

      if (forms.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Form not found or link is broken",
        });
      }

      const { form, workspace } = forms[0]!;

      if (form.status !== "published") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This form has not been published yet.",
        });
      }

      // Check Expiry Date
      const isExpired = form.expiryDate ? new Date() > new Date(form.expiryDate) : false;

      // Check Response Limit
      let isLimitReached = false;
      if (form.responseLimit) {
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.formResponsesTable)
          .where(eq(schema.formResponsesTable.formId, form.id));
        const numResponses = Number(countResult[0]?.count) || 0;
        if (numResponses >= form.responseLimit) {
          isLimitReached = true;
        }
      }

      // FIX #6 & #17: Only increment views when the form is actually usable
      // (not expired and not at response limit). Bots/crawlers hitting expired
      // forms should not inflate view counts.
      if (!isExpired && !isLimitReached) {
        await db
          .update(schema.formsTable)
          .set({ viewsCount: sql`${schema.formsTable.viewsCount} + 1` })
          .where(eq(schema.formsTable.id, form.id));
      }

      let parsedFields: any[] = [];
      const isPasswordProtected = !!form.password;

      if (!isPasswordProtected || (isPasswordProtected && input.password && verifyPassword(input.password, form.password!))) {
        const fields = await db
          .select()
          .from(schema.formFieldsTable)
          .where(eq(schema.formFieldsTable.formId, form.id))
          .orderBy(schema.formFieldsTable.order);

        parsedFields = fields.map((f) => ({
          id: f.id,
          type: f.type,
          label: f.label,
          placeholder: f.placeholder,
          required: f.required,
          order: f.order,
          options: f.options as string[] | null,
          validationRules: f.validationRules,
          conditionalLogic: f.conditionalLogic,
        }));
      }

      return {
        form: {
          id: form.id,
          title: form.title,
          description: form.description,
          theme: form.theme,
          customThemeConfig: form.customThemeConfig,
          layoutType: form.layoutType,
          removeBranding: workspace.removeBranding,
          isPasswordProtected,
          isExpired,
          isLimitReached,
        },
        fields: parsedFields,
      };
    }),

  incrementStarts: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/public/{id}/starts"), tags: TAGS } })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await db
        .update(schema.formsTable)
        .set({ startsCount: sql`${schema.formsTable.startsCount} + 1` })
        .where(eq(schema.formsTable.id, input.id));

      return { success: true };
    }),

  duplicate: workspaceProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{id}/duplicate"), tags: TAGS } })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ id: z.string(), title: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireRole(ctx.user.id, ctx.activeWorkspace.id, ["owner", "admin", "editor"]);

      const forms = await db
        .select()
        .from(schema.formsTable)
        .where(
          and(
            eq(schema.formsTable.id, input.id),
            eq(schema.formsTable.workspaceId, ctx.activeWorkspace.id)
          )
        )
        .limit(1);

      if (forms.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      const originalForm = forms[0]!;

      const newFormResult = await db
        .insert(schema.formsTable)
        .values({
          workspaceId: originalForm.workspaceId,
          title: `${originalForm.title} (Copy)`,
          description: originalForm.description,
          theme: originalForm.theme,
          customThemeConfig: originalForm.customThemeConfig,
          layoutType: originalForm.layoutType,
          status: "draft",
          visibility: originalForm.visibility,
          password: originalForm.password,
        })
        .returning();
      const newForm = newFormResult[0]!;

      const originalFields = await db
        .select()
        .from(schema.formFieldsTable)
        .where(eq(schema.formFieldsTable.formId, originalForm.id))
        .orderBy(schema.formFieldsTable.order);

      if (originalFields.length > 0) {
        await db.insert(schema.formFieldsTable).values(
          originalFields.map((f) => ({
            formId: newForm.id,
            type: f.type,
            label: f.label,
            placeholder: f.placeholder,
            required: f.required,
            order: f.order,
            options: f.options,
            validationRules: f.validationRules,
            conditionalLogic: f.conditionalLogic,
          }))
        );
      }

      await db.insert(schema.auditLogsTable).values({
        workspaceId: ctx.activeWorkspace.id,
        userId: ctx.user.id,
        action: "form_duplicated",
        details: `Duplicated form: ${originalForm.title} -> ${newForm.title}`,
      });

      return { id: newForm.id, title: newForm.title };
    }),

  // Owner-only preview — returns any form regardless of published status
  getPreviewForm: workspaceProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(
      z.object({
        form: z.object({
          id: z.string(),
          title: z.string(),
          description: z.string().nullable(),
          theme: z.string(),
          customThemeConfig: z.any().nullable(),
          layoutType: z.string(),
          status: z.string(),
        }),
        fields: z.array(
          z.object({
            id: z.string(),
            type: z.string(),
            label: z.string(),
            placeholder: z.string().nullable(),
            required: z.boolean(),
            order: z.number(),
            options: z.array(z.string()).nullable(),
            validationRules: z.any().nullable(),
            conditionalLogic: z.any().nullable(),
          })
        ),
      })
    )
    .query(async ({ input, ctx }) => {
      const forms = await db
        .select()
        .from(schema.formsTable)
        .where(
          and(
            eq(schema.formsTable.id, input.id),
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

      return {
        form: {
          id: form.id,
          title: form.title,
          description: form.description,
          theme: form.theme,
          customThemeConfig: form.customThemeConfig,
          layoutType: form.layoutType,
          status: form.status,
        },
        fields: fields.map((f) => ({
          id: f.id,
          type: f.type,
          label: f.label,
          placeholder: f.placeholder,
          required: f.required,
          order: f.order,
          options: f.options as string[] | null,
          validationRules: f.validationRules,
          conditionalLogic: f.conditionalLogic,
        })),
      };
    }),

  // ==========================================
  // DEVELOPER API ENDPOINTS
  // ==========================================
  listForApi: apiKeyProcedure
    .meta({ openapi: { method: "GET", path: getPath("/api/list"), tags: TAGS } })
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.number().min(0).default(0),
      }).optional().default({ limit: 50, cursor: 0 })
    )
    .output(
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            description: z.string().nullable(),
            status: z.string(),
            visibility: z.string(),
            layoutType: z.string(),
            theme: z.string(),
            customSlug: z.string().nullable(),
            viewsCount: z.number(),
            startsCount: z.number(),
            createdAt: z.date(),
          })
        ),
      })
    )
    .query(async ({ input, ctx }) => {
      const forms = await db
        .select()
        .from(schema.formsTable)
        .where(eq(schema.formsTable.workspaceId, ctx.activeWorkspace.id))
        .orderBy(desc(schema.formsTable.createdAt))
        .limit(input.limit)
        .offset(input.cursor);

      return {
        items: forms.map((f) => ({
          id: f.id,
          title: f.title,
          description: f.description,
          status: f.status,
          visibility: f.visibility,
          layoutType: f.layoutType,
          theme: f.theme,
          customSlug: f.customSlug,
          viewsCount: f.viewsCount,
          startsCount: f.startsCount,
          createdAt: f.createdAt,
        })),
      };
    }),

  getForApi: apiKeyProcedure
    .meta({ openapi: { method: "GET", path: getPath("/api/get/{id}"), tags: TAGS } })
    .input(z.object({ id: z.string().uuid() }))
    .output(
      z.object({
        form: z.object({
          id: z.string(),
          title: z.string(),
          description: z.string().nullable(),
          theme: z.string(),
          customThemeConfig: z.any().nullable(),
          layoutType: z.string(),
          status: z.string(),
          visibility: z.string(),
          createdAt: z.date(),
        }),
        fields: z.array(
          z.object({
            id: z.string(),
            type: z.string(),
            label: z.string(),
            placeholder: z.string().nullable(),
            required: z.boolean(),
            order: z.number(),
            options: z.array(z.string()).nullable(),
            validationRules: z.any().nullable(),
            conditionalLogic: z.any().nullable(),
          })
        ),
      })
    )
    .query(async ({ input, ctx }) => {
      const forms = await db
        .select()
        .from(schema.formsTable)
        .where(
          and(
            eq(schema.formsTable.id, input.id),
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

      return {
        form: {
          id: form.id,
          title: form.title,
          description: form.description,
          theme: form.theme,
          customThemeConfig: form.customThemeConfig,
          layoutType: form.layoutType,
          status: form.status,
          visibility: form.visibility,
          createdAt: form.createdAt,
        },
        fields: fields.map((f) => ({
          id: f.id,
          type: f.type,
          label: f.label,
          placeholder: f.placeholder,
          required: f.required,
          order: f.order,
          options: f.options as string[] | null,
          validationRules: f.validationRules,
          conditionalLogic: f.conditionalLogic,
        })),
      };
    }),
});
