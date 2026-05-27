import 'dotenv/config';
import { db } from './packages/database/src/index';
import { usersTable, workspacesTable, workspaceMembersTable } from './packages/database/src/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
  const hash = await bcrypt.hash('Pro@123456', 10);
  const email = 'pro@formcraft.com';

  // Upsert user
  const existing = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  let userId: string;
  if (existing[0]) {
    userId = existing[0].id;
    await db.update(usersTable)
      .set({ passwordHash: hash, emailVerified: true })
      .where(eq(usersTable.id, userId));
    console.log('Updated existing user');
  } else {
    const [newUser] = await db.insert(usersTable).values({
      fullName: 'Pro User',
      email,
      passwordHash: hash,
      emailVerified: true,
    }).returning({ id: usersTable.id });
    userId = newUser!.id;
    console.log('Created new user');
  }

  // Upsert workspace
  const existingWs = await db.select({ id: workspacesTable.id })
    .from(workspacesTable)
    .where(eq(workspacesTable.ownerId, userId))
    .limit(1);

  let wsId: string;
  if (existingWs[0]) {
    wsId = existingWs[0].id;
    await db.update(workspacesTable).set({ tier: 'pro' }).where(eq(workspacesTable.id, wsId));
    console.log('Upgraded workspace to pro');
  } else {
    const [newWs] = await db.insert(workspacesTable).values({
      name: 'Pro Workspace',
      slug: `pro-workspace-${Date.now()}`,
      ownerId: userId,
      tier: 'pro',
    }).returning({ id: workspacesTable.id });
    wsId = newWs!.id;

    await db.insert(workspaceMembersTable).values({
      workspaceId: wsId,
      userId,
      role: 'owner',
    });
    console.log('Created pro workspace');
  }

  console.log('\n✅ Done!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Email    : pro@formcraft.com');
  console.log('Password : Pro@123456');
  console.log('Tier     : pro');
  console.log('━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(0);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
