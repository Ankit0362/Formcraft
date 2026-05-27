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
  console.log("Creating enterprise user...");
  // Create Demo User
  const demoPasswordHash = hashPassword("enterprise123");
  const [demoUser] = await db.insert(schema.usersTable).values({
    fullName: "Enterprise Admin",
    email: "enterprise@formcraft.com",
    passwordHash: demoPasswordHash,
    emailVerified: true,
  }).returning();

  console.log("Creating enterprise workspace...");
  // Create Workspace
  const [workspace] = await db.insert(schema.workspacesTable).values({
    name: "Enterprise Corporation",
    slug: "enterprise-corp",
    tier: "enterprise", 
    removeBranding: true,
  }).returning();

  // Create member mapping
  await db.insert(schema.workspaceMembersTable).values({
    workspaceId: workspace.id,
    userId: demoUser.id,
    role: "owner",
  });

  console.log("Created successfully. Enterprise user ready.");
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
