import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

import { env } from "./env";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});
const db = drizzle(pool);

async function main() {
  console.log("Seeding 120 templates from JSON...");

  const dataPath = path.join(process.cwd(), "../../templates_data.json");
  const rawData = fs.readFileSync(dataPath, "utf-8");
  const templates = JSON.parse(rawData);

  // We can just insert them directly
  const chunkSize = 20;
  for (let i = 0; i < templates.length; i += chunkSize) {
    const chunk = templates.slice(i, i + chunkSize);
    await db.insert(schema.templatesTable).values(chunk);
    console.log(`Inserted templates ${i + 1} to ${i + chunk.length}`);
  }

  console.log("Seeding completed successfully!");
  pool.end();
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  pool.end();
});
