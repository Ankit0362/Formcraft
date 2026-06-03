import "dotenv/config";
import { db } from "./packages/database/index";
import { templatesTable, templateFieldsTable, usersTable } from "./packages/database/schema";
import fs from "fs";
import path from "path";

const INDUSTRY_TO_THEME_PREFIX: Record<string, string> = {
  "E-Commerce": "ecommerce",
  Ecommerce: "ecommerce",
  Healthcare: "healthcare",
  Education: "education",
  "Real Estate": "real_estate",
  Finance: "finance",
  "Event Management": "event_management",
  Events: "event_management",
  "Software/SaaS": "software_saas",
  Technology: "software_saas",
  Startup: "software_saas",
  Hospitality: "hospitality",
  "Non-Profit": "non_profit",
  HR: "non_profit",
  Marketing: "creative_agency",
  "Creative Agency": "creative_agency",
  Creative: "fitness_wellness",
  "Fitness & Wellness": "fitness_wellness",
  Fitness: "fitness_wellness",
  "Legal Services": "legal_services",
  Legal: "legal_services",
};

async function main() {
  console.log("Reading generated template data...");
  const data = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "templates_data.json"), "utf-8"),
  );

  // Get a system user to attach templates to (or leave null if creatorId is optional)
  // Let's create a system creator if none exists
  let creatorId = null;
  const sysUsers = await db.select().from(usersTable).limit(1);
  if (sysUsers.length > 0) {
    creatorId = sysUsers[0].id;
  } else {
    const [newUser] = await db
      .insert(usersTable)
      .values({
        fullName: "System",
        email: "system@formcraft.com",
        passwordHash: "dummy",
        emailVerified: true,
      })
      .returning();
    creatorId = newUser.id;
  }

  console.log("Inserting 120 templates...");
  const industryCounters: Record<string, number> = {};

  // To avoid violating the free tier limits on dev environments, we will just wipe old ones or leave them.
  // Actually, wiping is better to ensure clean state for 120 unique ones.
  await db.delete(templatesTable);

  const BATCH_SIZE = 20;
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE).map((t: any) => {
      const industry = t.industry || "E-Commerce";
      const prefix = INDUSTRY_TO_THEME_PREFIX[industry] || "ecommerce";
      const nextCount = (industryCounters[prefix] || 0) + 1;

      if (nextCount > 10) {
        throw new Error(
          `Industry prefix "${prefix}" exceeded 10 templates. Add more themes before seeding to keep each template visually unique.`,
        );
      }

      industryCounters[prefix] = nextCount;

      return {
        title: t.title,
        description: t.description,
        industry,
        price: t.price,
        // Never trust stale JSON theme IDs; derive a valid key that exists in apps/web/lib/themes.ts.
        theme: `${prefix}_${nextCount}`,
        downloadsCount: t.downloadsCount,
        isCurated: t.isCurated,
        creatorId,
        layoutType: "classic",
      };
    });

    const inserted = await db.insert(templatesTable).values(batch).returning();

    // Create 3 basic fields for every template
    for (const template of inserted) {
      await db.insert(templateFieldsTable).values([
        { templateId: template.id, type: "short_text", label: "Name", required: true, order: 0 },
        {
          templateId: template.id,
          type: "email",
          label: "Email Address",
          required: true,
          order: 1,
        },
        { templateId: template.id, type: "long_text", label: "Message", required: false, order: 2 },
      ]);
    }

    console.log(`Inserted batch ${i / BATCH_SIZE + 1}/${Math.ceil(data.length / BATCH_SIZE)}`);
  }

  console.log("✅ Successfully seeded 120 templates!");
  process.exit(0);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
