require('dotenv').config({ path: '.env' });
const { Pool } = require('./packages/database/node_modules/pg');
const bcrypt = require('./apps/api/node_modules/bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const hash = await bcrypt.hash('Pro@123456', 10);

  const userRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, email_verified)
     VALUES ('Pro User', 'pro@formcraft.com', $1, true)
     ON CONFLICT (email) DO UPDATE SET password_hash = $1, email_verified = true
     RETURNING id`,
    [hash]
  );
  const userId = userRes.rows[0].id;

  const wsRes = await pool.query(
    `INSERT INTO workspaces (name, slug, owner_id, tier)
     VALUES ('Pro Workspace', 'pro-workspace', $1, 'pro')
     ON CONFLICT (slug) DO UPDATE SET tier = 'pro', owner_id = $1
     RETURNING id`,
    [userId]
  );
  const wsId = wsRes.rows[0].id;

  await pool.query(
    `INSERT INTO workspace_members (workspace_id, user_id, role)
     VALUES ($1, $2, 'owner')
     ON CONFLICT (workspace_id, user_id) DO NOTHING`,
    [wsId, userId]
  );

  console.log('✅ Pro account created!');
  console.log('Email    : pro@formcraft.com');
  console.log('Password : Pro@123456');
  console.log('Tier     : pro');
  await pool.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
