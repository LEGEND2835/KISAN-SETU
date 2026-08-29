import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'kisansetu_db',
  password: process.env.PGPASSWORD,
  port: parseInt(process.env.PGPORT || '5432', 10),
});

async function verifyDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking PostgreSQL 18 database structure...');
    
    // Check tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log(`✅ Tables found (${tablesRes.rows.length}):`, tablesRes.rows.map(r => r.table_name).join(', '));

    // Check row counts
    for (const row of tablesRes.rows) {
      const countRes = await client.query(`SELECT COUNT(*) as count FROM "${row.table_name}"`);
      console.log(`  📊 ${row.table_name}: ${countRes.rows[0].count} records`);
    }

    // Check indexes
    const indexRes = await client.query(`
      SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';
    `);
    console.log(`\n✅ Indexes found (${indexRes.rows.length}):`);
    indexRes.rows.forEach(idx => console.log(`  ⚡ ${idx.tablename} -> ${idx.indexname}`));

  } catch (err) {
    console.error('❌ Verification Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyDatabase();
