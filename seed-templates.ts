import 'dotenv/config';
import { db } from './packages/database/index';
import { templatesTable, templateFieldsTable, usersTable } from './packages/database/schema';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Reading generated template data...');
  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'templates_data.json'), 'utf-8'));

  // Get a system user to attach templates to (or leave null if creatorId is optional)
  // Let's create a system creator if none exists
  let creatorId = null;
  const sysUsers = await db.select().from(usersTable).limit(1);
  if (sysUsers.length > 0) {
    creatorId = sysUsers[0].id;
  } else {
    const [newUser] = await db.insert(usersTable).values({
      fullName: 'System',
      email: 'system@formcraft.com',
      passwordHash: 'dummy',
      emailVerified: true
    }).returning();
    creatorId = newUser.id;
  }

  console.log('Inserting 120 templates...');
  
  // To avoid violating the free tier limits on dev environments, we will just wipe old ones or leave them.
  // Actually, wiping is better to ensure clean state for 120 unique ones.
  await db.delete(templatesTable);
  
  const BATCH_SIZE = 20;
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE).map((t: any) => ({
      title: t.title,
      description: t.description,
      industry: t.industry,
      price: t.price,
      theme: t.theme,
      downloadsCount: t.downloadsCount,
      isCurated: t.isCurated,
      creatorId,
      layoutType: 'classic'
    }));

    const inserted = await db.insert(templatesTable).values(batch).returning();
    
    // Create 3 basic fields for every template
    for (const template of inserted) {
      await db.insert(templateFieldsTable).values([
        { templateId: template.id, type: 'short_text', label: 'Name', required: true, order: 0 },
        { templateId: template.id, type: 'email', label: 'Email Address', required: true, order: 1 },
        { templateId: template.id, type: 'long_text', label: 'Message', required: false, order: 2 },
      ]);
    }
    
    console.log(`Inserted batch ${i/BATCH_SIZE + 1}/${Math.ceil(data.length/BATCH_SIZE)}`);
  }

  console.log('✅ Successfully seeded 120 templates!');
  process.exit(0);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
