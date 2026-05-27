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

const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  console.log("🔧 Running DB column migrations...");

  // Add columns that may not exist yet (safe — IF NOT EXISTS won't error if already there)
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;
  `);
  console.log("  ✅ users.is_super_admin column ready");

  await pool.query(`
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_hint VARCHAR(10);
  `);
  console.log("  ✅ api_keys.key_hint column ready");

  // ─────────────────────────────────────────
  // Create or update Super Admin account
  // ─────────────────────────────────────────
  const ADMIN_EMAIL = "superadmin@formcraft.com";
  const ADMIN_PASSWORD = "FormCraft@Admin123";
  const ADMIN_NAME = "Super Admin";

  const existingAdmins = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.email, ADMIN_EMAIL))
    .limit(1);

  let adminUser;

  if (existingAdmins.length > 0) {
    // Update existing user to be super admin
    const updated = await db
      .update(schema.usersTable)
      .set({
        isSuperAdmin: true,
        passwordHash: hashPassword(ADMIN_PASSWORD),
        fullName: ADMIN_NAME,
        emailVerified: true,
      })
      .where(eq(schema.usersTable.email, ADMIN_EMAIL))
      .returning();
    adminUser = updated[0]!;
    console.log("  ✅ Existing super admin account updated");
  } else {
    // Create new super admin
    const created = await db
      .insert(schema.usersTable)
      .values({
        fullName: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash: hashPassword(ADMIN_PASSWORD),
        emailVerified: true,
        isSuperAdmin: true,
      })
      .returning();
    adminUser = created[0]!;
    console.log("  ✅ Super admin account created");
  }

  // Give the super admin their own workspace (needed for dashboard to work)
  const existingWorkspaces = await db
    .select()
    .from(schema.workspaceMembersTable)
    .where(eq(schema.workspaceMembersTable.userId, adminUser.id))
    .limit(1);

  if (existingWorkspaces.length === 0) {
    const [adminWorkspace] = await db
      .insert(schema.workspacesTable)
      .values({
        name: "Super Admin Panel",
        slug: "super-admin-panel",
        tier: "enterprise",
        removeBranding: true,
      })
      .returning();

    await db.insert(schema.workspaceMembersTable).values({
      workspaceId: adminWorkspace!.id,
      userId: adminUser.id,
      role: "owner",
    });
    console.log("  ✅ Super admin workspace created");
  } else {
    console.log("  ✅ Super admin workspace already exists");
  }

  console.log("\n✅ Super Admin Setup Complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  📧 Email   : ${ADMIN_EMAIL}`);
  console.log(`  🔑 Password: ${ADMIN_PASSWORD}`);
  console.log(`  👑 Role    : Super Admin (can upgrade any workspace)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n  Admin Panel: http://localhost:3000/admin");
  console.log("  Dashboard  : http://localhost:3000/dashboard\n");

  await pool.end();
}

main().catch((e) => {
  console.error("❌ Setup failed:", e);
  pool.end();
  process.exit(1);
});
