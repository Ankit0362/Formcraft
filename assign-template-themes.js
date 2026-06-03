/**
 * assign-distinct-template-themes.js
 *
 * Updates every template in the DB to have a unique, industry-matched theme.
 * Fetches all templates ordered by industry, then assigns themes sequentially.
 */
require("dotenv").config();
const { Client } = require("./packages/database/node_modules/pg");

// The 12 industries from our new theme system, mapped to industry DB strings
const INDUSTRY_TO_THEME_PREFIX = {
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
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("Connected. Assigning distinct themes to templates...");

  const res = await client.query(
    "SELECT id, industry FROM templates ORDER BY industry, created_at",
  );

  // Group by industry prefix
  const industryCounters = {};
  let totalUpdated = 0;

  for (const row of res.rows) {
    const industry = row.industry || "E-Commerce";
    const prefix = INDUSTRY_TO_THEME_PREFIX[industry] || "ecommerce";

    if (!industryCounters[prefix]) industryCounters[prefix] = 0;
    industryCounters[prefix]++;

    if (industryCounters[prefix] > 10) {
      throw new Error(
        `Industry prefix "${prefix}" exceeded 10 templates. Add more theme variants before assigning to keep templates visually distinct.`,
      );
    }

    // Keep each template in an industry on a unique theme (1-10).
    const num = industryCounters[prefix];
    const newTheme = `${prefix}_${num}`;

    await client.query("UPDATE templates SET theme=$1 WHERE id=$2", [newTheme, row.id]);
    console.log(`  [template ${row.id}] industry="${industry}" → theme="${newTheme}"`);
    totalUpdated++;
  }

  console.log(`\n✅ Done! ${totalUpdated} templates assigned distinct themes.`);
  await client.end();
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
