/**
 * migrate-themes.js
 * 
 * Migrates all forms and templates that have obsolete theme names
 * (e.g. "neon", "glassmorphism", "default", "cyberpunk") to valid
 * new theme keys like "ecommerce_1", "software_saas_3", etc.
 *
 * Run with: node migrate-themes.js (from monorepo root)
 */
require('dotenv').config();
const { Client } = require('./packages/database/node_modules/pg');

const THEME_MAP = {
  'neon':           'creative_agency_5',
  'glassmorphism':  'software_saas_3',
  'cyberpunk':      'fitness_wellness_5',
  'default':        'ecommerce_1',
  'brutalist':      'ecommerce_1',
  'minimal':        'healthcare_2',
  'dark':           'legal_services_10',
  'ocean':          'healthcare_1',
  'forest':         'non_profit_2',
  'sunset':         'event_management_3',
  'corporate':      'finance_4',
  'pastel':         'education_7',
  'dynamic':        'software_saas_1',
  'luxury':         'real_estate_1',
};

const VALID_THEMES = [
  "ecommerce_1","ecommerce_2","ecommerce_3","ecommerce_4","ecommerce_5",
  "ecommerce_6","ecommerce_7","ecommerce_8","ecommerce_9","ecommerce_10",
  "healthcare_1","healthcare_2","healthcare_3","healthcare_4","healthcare_5",
  "healthcare_6","healthcare_7","healthcare_8","healthcare_9","healthcare_10",
  "education_1","education_2","education_3","education_4","education_5",
  "education_6","education_7","education_8","education_9","education_10",
  "real_estate_1","real_estate_2","real_estate_3","real_estate_4","real_estate_5",
  "real_estate_6","real_estate_7","real_estate_8","real_estate_9","real_estate_10",
  "finance_1","finance_2","finance_3","finance_4","finance_5",
  "finance_6","finance_7","finance_8","finance_9","finance_10",
  "event_management_1","event_management_2","event_management_3","event_management_4","event_management_5",
  "event_management_6","event_management_7","event_management_8","event_management_9","event_management_10",
  "software_saas_1","software_saas_2","software_saas_3","software_saas_4","software_saas_5",
  "software_saas_6","software_saas_7","software_saas_8","software_saas_9","software_saas_10",
  "hospitality_1","hospitality_2","hospitality_3","hospitality_4","hospitality_5",
  "hospitality_6","hospitality_7","hospitality_8","hospitality_9","hospitality_10",
  "non_profit_1","non_profit_2","non_profit_3","non_profit_4","non_profit_5",
  "non_profit_6","non_profit_7","non_profit_8","non_profit_9","non_profit_10",
  "creative_agency_1","creative_agency_2","creative_agency_3","creative_agency_4","creative_agency_5",
  "creative_agency_6","creative_agency_7","creative_agency_8","creative_agency_9","creative_agency_10",
  "fitness_wellness_1","fitness_wellness_2","fitness_wellness_3","fitness_wellness_4","fitness_wellness_5",
  "fitness_wellness_6","fitness_wellness_7","fitness_wellness_8","fitness_wellness_9","fitness_wellness_10",
  "legal_services_1","legal_services_2","legal_services_3","legal_services_4","legal_services_5",
  "legal_services_6","legal_services_7","legal_services_8","legal_services_9","legal_services_10",
];

const validSet = new Set(VALID_THEMES);

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to DB. Migrating themes...');

  // Migrate forms table
  const formsRes = await client.query("SELECT id, theme FROM forms");
  let formsMigrated = 0;
  for (const row of formsRes.rows) {
    const oldTheme = row.theme;
    if (validSet.has(oldTheme)) continue; // already valid, skip
    
    const newTheme = THEME_MAP[oldTheme] || 'ecommerce_1';
    await client.query("UPDATE forms SET theme=$1 WHERE id=$2", [newTheme, row.id]);
    console.log(`  [forms] ${row.id}: "${oldTheme}" → "${newTheme}"`);
    formsMigrated++;
  }
  console.log(`Forms: ${formsMigrated} records updated.`);

  // Migrate templates table
  const tplRes = await client.query("SELECT id, theme FROM templates");
  let tplMigrated = 0;
  for (const row of tplRes.rows) {
    const oldTheme = row.theme;
    if (validSet.has(oldTheme)) continue;
    
    const newTheme = THEME_MAP[oldTheme] || 'ecommerce_1';
    await client.query("UPDATE templates SET theme=$1 WHERE id=$2", [newTheme, row.id]);
    console.log(`  [templates] ${row.id}: "${oldTheme}" → "${newTheme}"`);
    tplMigrated++;
  }
  console.log(`Templates: ${tplMigrated} records updated.`);

  await client.end();
  console.log('✅ Migration complete!');
}

migrate().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
