import { db } from "../index";
import { sql } from "drizzle-orm";
import { hashPassword } from "../../../packages/trpc/server/utils/password";
import { v4 as uuidv4 } from "uuid";

async function createProUser() {
  const email = 'pro@formcraft.com';
  const password = 'pro';
  const hash = hashPassword(password);
  
  const userId = uuidv4();
  await db.execute(sql`
    INSERT INTO users (id, full_name, email, password_hash, email_verified)
    VALUES (${userId}, 'Pro User', ${email}, ${hash}, true)
  `);

  const workspaceId = uuidv4();
  await db.execute(sql`
    INSERT INTO workspaces (id, name, slug, tier)
    VALUES (${workspaceId}, 'Pro Workspace', 'pro-workspace-1', 'pro')
  `);

  await db.execute(sql`
    INSERT INTO workspace_members (id, workspace_id, user_id, role)
    VALUES (${uuidv4()}, ${workspaceId}, ${userId}, 'owner')
  `);

  console.log('Created PRO user: ' + email + ' / ' + password);
  process.exit(0);
}

createProUser().catch(console.error);
