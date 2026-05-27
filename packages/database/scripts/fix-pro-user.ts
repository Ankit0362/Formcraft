import { db } from "../index";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

async function fixProUser() {
  const email = 'pro@formcraft.com';
  
  // Get user
  const userResult = await db.execute(sql`SELECT id FROM users WHERE email = ${email}`);
  if (userResult.rows.length === 0) {
    console.error("User not found!");
    process.exit(1);
  }
  const userId = userResult.rows[0].id;

  // Get workspace
  const workspaceResult = await db.execute(sql`SELECT id FROM workspaces WHERE slug = 'pro-workspace-1'`);
  if (workspaceResult.rows.length === 0) {
    console.error("Workspace not found!");
    process.exit(1);
  }
  const workspaceId = workspaceResult.rows[0].id;

  // Check if member already exists
  const memberResult = await db.execute(sql`SELECT id FROM workspace_members WHERE user_id = ${userId} AND workspace_id = ${workspaceId}`);
  if (memberResult.rows.length === 0) {
    // Insert into workspace_members without updated_at
    await db.execute(sql`
      INSERT INTO workspace_members (id, workspace_id, user_id, role)
      VALUES (${uuidv4()}, ${workspaceId}, ${userId}, 'owner')
    `);
    console.log('Fixed PRO user: added to workspace!');
  } else {
    console.log('User is already in the workspace!');
  }
  
  process.exit(0);
}

fixProUser().catch(console.error);
