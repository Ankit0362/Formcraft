import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";

import { env } from "./env";
import * as schema from "./schema";
import crypto from "node:crypto";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});
const db = drizzle(pool);

async function main() {
  console.log("Seeding database...");

  // Delete all existing data in correct order
  console.log("Clearing existing data...");
  await db.delete(schema.webhookLogsTable);
  await db.delete(schema.webhooksTable);
  await db.delete(schema.auditLogsTable);
  await db.delete(schema.emailsTable);
  await db.delete(schema.formResponsesTable);
  await db.delete(schema.formFieldsTable);
  await db.delete(schema.formsTable);
  await db.delete(schema.workspaceMembersTable);
  await db.delete(schema.apiKeysTable);
  await db.delete(schema.workspacesTable);
  await db.delete(schema.usersTable);

  console.log("Creating users...");
  // Create Demo User
  const demoPasswordHash = hashPassword("password123");
  const [demoUser] = await db.insert(schema.usersTable).values({
    fullName: "Demo Admin",
    email: "demo@formcraft.com",
    passwordHash: demoPasswordHash,
    emailVerified: true,
  }).returning();

  // Always re-create the Super Admin after seed wipe
  const [superAdminUser] = await db.insert(schema.usersTable).values({
    fullName: "Super Admin",
    email: "superadmin@formcraft.com",
    passwordHash: hashPassword("FormCraft@Admin123"),
    emailVerified: true,
    isSuperAdmin: true,
  }).returning();

  console.log("Creating workspaces...");
  // Create Workspace
  const [workspace] = await db.insert(schema.workspacesTable).values({
    name: "Demo Agency Workspace",
    slug: "demo-agency",
    tier: "business",
    removeBranding: true,
  }).returning();

  // Create member mapping for demo user
  await db.insert(schema.workspaceMembersTable).values({
    workspaceId: workspace.id,
    userId: demoUser.id,
    role: "owner",
  });

  // Create Super Admin workspace
  const [adminWorkspace] = await db.insert(schema.workspacesTable).values({
    name: "Super Admin Panel",
    slug: "super-admin-panel",
    tier: "enterprise",
    removeBranding: true,
  }).returning();

  await db.insert(schema.workspaceMembersTable).values({
    workspaceId: adminWorkspace!.id,
    userId: superAdminUser!.id,
    role: "owner",
  });

  console.log("Creating forms...");
  
  // 1. Anime Quiz
  const [animeForm] = await db.insert(schema.formsTable).values({
    workspaceId: workspace.id,
    title: "Anime & Manga Quiz",
    description: "Test your ultimate otaku knowledge!",
    status: "published",
    visibility: "public",
    layoutType: "conversational",
    theme: "creative_agency_5",
    viewsCount: 142,
    startsCount: 90,
  }).returning();

  // 2. Startup Feedback Form
  const [startupForm] = await db.insert(schema.formsTable).values({
    workspaceId: workspace.id,
    title: "Startup Feedback & NPS",
    description: "Help us understand your business challenges.",
    status: "published",
    visibility: "public",
    layoutType: "classic",
    theme: "software_saas_3",
    viewsCount: 50,
    startsCount: 42,
  }).returning();

  // 3. Movie Trivia Form
  const [movieForm] = await db.insert(schema.formsTable).values({
    workspaceId: workspace.id,
    title: "Movie Trivia Form",
    description: "An unlisted, password-protected cinema survey.",
    status: "published",
    visibility: "unlisted",
    layoutType: "conversational",
    theme: "fitness_wellness_5",
    password: hashPassword("trivia2026"),
    viewsCount: 80,
    startsCount: 40,
  }).returning();

  console.log("Creating form fields...");
  
  // Fields for Anime Quiz
  const animeFields = await db.insert(schema.formFieldsTable).values([
    {
      formId: animeForm.id,
      type: "short_text",
      label: "What is your favorite anime?",
      placeholder: "e.g. Naruto, Attack on Titan",
      required: true,
      order: 1,
    },
    {
      formId: animeForm.id,
      type: "select",
      label: "Which genre do you watch the most?",
      required: true,
      order: 2,
      options: ["Action/Shonen", "Slice of Life", "Fantasy/Isekai", "Romance"],
    },
    {
      formId: animeForm.id,
      type: "rating",
      label: "Rate your anime obsession (1 to 5 stars)",
      required: false,
      order: 3,
    },
    {
      formId: animeForm.id,
      type: "short_text",
      label: "Who wrote the Naruto manga series?",
      placeholder: "e.g. Masashi Kishimoto",
      required: true,
      order: 4,
      conditionalLogic: [
        {
          dependOnFieldId: "genre_field_placeholder", // Will replace below with actual UUID
          operator: "equals",
          value: "Action/Shonen",
          action: "show",
        }
      ],
    },
    {
      formId: animeForm.id,
      type: "date",
      label: "When did you watch your very first anime?",
      required: false,
      order: 5,
    }
  ]).returning();

  // Fix conditional logic dependOnFieldId for Naruto question
  const selectFieldId = animeFields.find(f => f.type === "select")?.id;
  const narutoField = animeFields.find(f => f.label.includes("Naruto"));
  if (selectFieldId && narutoField) {
    await db.update(schema.formFieldsTable)
      .set({
        conditionalLogic: [
          {
            dependOnFieldId: selectFieldId,
            operator: "equals",
            value: "Action/Shonen",
            action: "show",
          }
        ]
      })
      .where(eq(schema.formFieldsTable.id, narutoField.id));
  }

  // Fields for Startup Feedback
  const startupFields = await db.insert(schema.formFieldsTable).values([
    {
      formId: startupForm.id,
      type: "email",
      label: "Your work email address",
      placeholder: "name@company.com",
      required: true,
      order: 1,
    },
    {
      formId: startupForm.id,
      type: "number",
      label: "Company size (number of employees)",
      placeholder: "e.g. 15",
      required: true,
      order: 2,
    },
    {
      formId: startupForm.id,
      type: "long_text",
      label: "Describe your biggest business challenge today",
      placeholder: "e.g. Hiring talent, fundraising...",
      required: true,
      order: 3,
    },
    {
      formId: startupForm.id,
      type: "checkbox", // Multi-select style
      label: "Which platforms do you use for customer communication?",
      required: false,
      order: 4,
      options: ["Zendesk", "Intercom", "Help Scout", "Slack"],
    }
  ]).returning();

  // Fields for Movie Trivia
  const movieFields = await db.insert(schema.formFieldsTable).values([
    {
      formId: movieForm.id,
      type: "select",
      label: "Who directed the movie Inception?",
      required: true,
      order: 1,
      options: ["Christopher Nolan", "Quentin Tarantino", "Martin Scorsese", "Steven Spielberg"],
    },
    {
      formId: movieForm.id,
      type: "rating",
      label: "Rate the movie Interstellar (1 to 5 stars)",
      required: true,
      order: 2,
    },
    {
      formId: movieForm.id,
      type: "short_text",
      label: "What is the name of the AI character in 2001: A Space Odyssey?",
      placeholder: "H.A.L. ...",
      required: false,
      order: 3,
    }
  ]).returning();

  console.log("Seeding responses (Submissions & Funnel Drop-offs)...");
  
  // Seed Completed responses for Anime
  const animeQ1 = animeFields[0].id;
  const animeQ2 = animeFields[1].id;
  const animeQ3 = animeFields[2].id;
  const animeQ4 = animeFields[3].id;
  const animeQ5 = animeFields[4].id;

  const mockUsers = [
    { name: "John Doe", email: "john@example.com" },
    { name: "Alice Smith", email: "alice@example.com" },
    { name: "Bob Johnson", email: "bob@example.com" },
    { name: "Emily Davis", email: "emily@example.com" },
    { name: "Charlie Brown", email: "charlie@example.com" }
  ];

  for (let i = 0; i < 60; i++) {
    const isShonen = i % 2 === 0;
    const answers = {
      [animeQ1]: ["Naruto", "Attack on Titan", "Demon Slayer", "One Piece", "Death Note"][i % 5],
      [animeQ2]: isShonen ? "Action/Shonen" : ["Slice of Life", "Fantasy/Isekai", "Romance"][i % 3],
      [animeQ3]: (i % 5) + 1,
      ...(isShonen ? { [animeQ4]: "Masashi Kishimoto" } : {}),
      [animeQ5]: `201${i % 9}-05-24`
    };
    await db.insert(schema.formResponsesTable).values({
      formId: animeForm.id,
      answers,
      completed: true,
      metadata: {
        ip: `192.168.1.${10 + i}`,
        browser: "Chrome",
        responseTime: Math.floor(Math.random() * 40) + 15,
      },
      createdAt: new Date(Date.now() - i * 2 * 60 * 60 * 1000), // Spaced out dates
    });
  }

  // Seed Incomplete (Drop-off) responses for Anime Quiz
  // 30 drop-offs: 20 abandoned at Question 4 (Naruto writer), 10 abandoned at Question 2 (Genre)
  for (let i = 0; i < 20; i++) {
    const answers = {
      [animeQ1]: "My Hero Academia",
      [animeQ2]: "Action/Shonen",
      [animeQ3]: 4,
    };
    await db.insert(schema.formResponsesTable).values({
      formId: animeForm.id,
      answers,
      completed: false,
      lastActiveFieldId: animeQ4,
      metadata: { ip: `10.0.0.${i}`, browser: "Safari" },
      createdAt: new Date(Date.now() - i * 3 * 60 * 60 * 1000),
    });
  }

  for (let i = 0; i < 10; i++) {
    const answers = {
      [animeQ1]: "Haikyuu!!",
    };
    await db.insert(schema.formResponsesTable).values({
      formId: animeForm.id,
      answers,
      completed: false,
      lastActiveFieldId: animeQ2,
      metadata: { ip: `10.0.1.${i}`, browser: "Firefox" },
      createdAt: new Date(Date.now() - i * 5 * 60 * 60 * 1000),
    });
  }

  // Seed responses for Startup Form
  const startQ1 = startupFields[0].id;
  const startQ2 = startupFields[1].id;
  const startQ3 = startupFields[2].id;
  const startQ4 = startupFields[3].id;

  for (let i = 0; i < 42; i++) {
    const answers = {
      [startQ1]: `founder${i}@startup${i}.com`,
      [startQ2]: (i % 3 === 0) ? 5 : (i % 2 === 0 ? 12 : 45),
      [startQ3]: ["Finding early customers", "Scaling product performance", "Funding and cashflow", "Marketing reach"][i % 4],
      [startQ4]: (i % 3 === 0) ? ["Slack"] : (i % 2 === 0 ? ["Intercom", "Slack"] : ["Zendesk"])
    };
    await db.insert(schema.formResponsesTable).values({
      formId: startupForm.id,
      answers,
      completed: true,
      metadata: {
        ip: `198.162.2.${100 + i}`,
        browser: "Chrome",
        responseTime: Math.floor(Math.random() * 60) + 30,
      },
      createdAt: new Date(Date.now() - i * 4 * 60 * 60 * 1000),
    });
  }

  // Seed responses for Movie Trivia Form
  const movieQ1 = movieFields[0].id;
  const movieQ2 = movieFields[1].id;
  const movieQ3 = movieFields[2].id;

  for (let i = 0; i < 35; i++) {
    const answers = {
      [movieQ1]: i % 3 === 0 ? "Christopher Nolan" : ["Quentin Tarantino", "Martin Scorsese"][i % 2],
      [movieQ2]: (i % 3 === 0) ? 5 : 4,
      [movieQ3]: i % 2 === 0 ? "HAL 9000" : "HAL"
    };
    await db.insert(schema.formResponsesTable).values({
      formId: movieForm.id,
      answers,
      completed: true,
      metadata: {
        ip: `172.16.5.${i}`,
        browser: "Edge",
        responseTime: Math.floor(Math.random() * 20) + 10,
      },
      createdAt: new Date(Date.now() - i * 6 * 60 * 60 * 1000),
    });
  }

  console.log("Seeding simulated email notifications outbox...");
  await db.insert(schema.emailsTable).values([
    {
      formId: animeForm.id,
      recipient: "demo@formcraft.com",
      subject: "New Response for Anime & Manga Quiz!",
      body: "Otaku John Doe just submitted answers to your Anime & Manga Quiz. View them in the responses dashboard.",
    },
    {
      formId: animeForm.id,
      recipient: "john@example.com",
      subject: "Thank you for filling out Anime & Manga Quiz!",
      body: "Hi John Doe, your answers have been recorded. Thank you for your submission!",
    },
    {
      formId: startupForm.id,
      recipient: "demo@formcraft.com",
      subject: "New Response for Startup Feedback & NPS",
      body: "founder0@startup0.com completed your Startup Feedback form. Biggest challenge reported: Finding early customers.",
    }
  ]);

  console.log("Seeding Webhook integrations & Logs...");
  const [webhook] = await db.insert(schema.webhooksTable).values({
    workspaceId: workspace.id,
    url: "https://api.my-crm.com/v1/form-leads",
    active: true,
  }).returning();

  await db.insert(schema.webhookLogsTable).values([
    {
      webhookId: webhook.id,
      event: "response.completed",
      payload: {
        formId: startupForm.id,
        formTitle: startupForm.title,
        answers: {
          [startQ1]: "founder@company.com",
          [startQ2]: 15,
        }
      },
      responseStatus: 200,
    },
    {
      webhookId: webhook.id,
      event: "response.completed",
      payload: {
        formId: startupForm.id,
        formTitle: startupForm.title,
        answers: {
          [startQ1]: "anotherfounder@growth.co",
          [startQ2]: 3,
        }
      },
      responseStatus: 200,
    }
  ]);

  const rawSeedKey = "fc_live_7644995305demoapiaccesskeysec12345";
  const hashedSeedKey = crypto.createHash("sha256").update(rawSeedKey).digest("hex");
  await db.insert(schema.apiKeysTable).values({
    workspaceId: workspace.id,
    key: hashedSeedKey,
    name: "Production Lead Sync",
  });

  console.log("Seeding Marketplace Templates...");
  
  const [template1, template2, template3] = await db.insert(schema.templatesTable).values([
    {
      title: "Startup Investor Pitch Form",
      description: "Gather necessary info from potential investors quickly. Designed for fast-moving startups.",
      industry: "Startup",
      price: 0,
      layoutType: "conversational",
      theme: "software_saas_3",
      isCurated: true,
      downloadsCount: 145,
    },
    {
      title: "Patient Intake & Medical History",
      description: "Secure, structured HIPAA-compliant ready form for new patient intake.",
      industry: "Healthcare",
      price: 1900, // $19.00
      layoutType: "classic",
      theme: "healthcare_1",
      isCurated: true,
      downloadsCount: 89,
    },
    {
      title: "Creative Agency Project Brief",
      description: "Qualify your leads and gather detailed project scopes before getting on a call.",
      industry: "Creative",
      price: 500, // $5.00
      layoutType: "conversational",
      theme: "creative_agency_5",
      isCurated: false,
      downloadsCount: 320,
    }
  ]).returning();

  await db.insert(schema.templateFieldsTable).values([
    // Template 1 Fields
    {
      templateId: template1.id,
      type: "short_text",
      label: "Investor Name / Fund Name",
      order: 1,
      required: true,
    },
    {
      templateId: template1.id,
      type: "email",
      label: "Contact Email",
      order: 2,
      required: true,
    },
    {
      templateId: template1.id,
      type: "select",
      label: "Typical Check Size",
      order: 3,
      options: ["$10k - $50k", "$50k - $250k", "$250k+"],
    },
    // Template 2 Fields
    {
      templateId: template2.id,
      type: "short_text",
      label: "Patient Full Legal Name",
      order: 1,
      required: true,
    },
    {
      templateId: template2.id,
      type: "date",
      label: "Date of Birth",
      order: 2,
      required: true,
    },
    {
      templateId: template2.id,
      type: "long_text",
      label: "Current Medical Conditions",
      order: 3,
    },
    // Template 3 Fields
    {
      templateId: template3.id,
      type: "short_text",
      label: "Company Name",
      order: 1,
      required: true,
    },
    {
      templateId: template3.id,
      type: "long_text",
      label: "Describe your project goals",
      order: 2,
      required: true,
    },
    {
      templateId: template3.id,
      type: "select",
      label: "Estimated Budget",
      order: 3,
      options: ["< $5k", "$5k - $10k", "$10k+"],
    }
  ]);

  console.log("Seeding completed successfully!");
  pool.end();
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  pool.end();
});
