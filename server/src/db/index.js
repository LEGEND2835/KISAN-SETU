import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// PostgreSQL Connection Configuration
const connectionString = process.env.DATABASE_URL;
const poolConfig = connectionString
  ? { connectionString }
  : {
      user: process.env.PGUSER || 'postgres',
      host: process.env.PGHOST || 'localhost',
      database: process.env.PGDATABASE || 'kisansetu_db',
      password: process.env.PGPASSWORD !== undefined ? String(process.env.PGPASSWORD) : 'postgres',
      port: parseInt(process.env.PGPORT || '5432', 10),
    };

export let pool = null;
export let isUsingMockStore = false;

// Resilient In-Memory Store if Postgres is offline / development fallback
export const inMemoryStore = {
  users: [],
  centres: [],
  slots: [],
  bookings: [],
  quality_checks: [],
  weighbridge_logs: [],
  payments: [],
  queue_audit_logs: [],
};

/**
 * Initialize Database connection and verify/apply schema
 */
export async function initDatabase() {
  try {
    pool = new Pool(poolConfig);
    
    // Test connection with timeout
    const client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout to localhost:5432')), 3000)),
    ]);

    console.log(`✅ [PostgreSQL 18] Connected successfully to database "${poolConfig.database || 'kisansetu_db'}" on ${poolConfig.host || 'localhost'}:${poolConfig.port || 5432}`);
    
    // Apply DDL Schema
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schemaSql);
    client.release();
    
    console.log('✅ [PostgreSQL 18] Schema tables and indexes verified/created successfully.');
    isUsingMockStore = false;
    return true;
  } catch (err) {
    console.warn(`⚠️ PostgreSQL connection not established (${err.message}).`);
    console.log('⚡ Activating Built-in Fast Resilient Store as development fallback.');
    isUsingMockStore = true;
    return false;
  }
}

/**
 * Execute SQL Query with automatic parameter binding
 */
export async function query(text, params = []) {
  if (!isUsingMockStore && pool) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.error('PostgreSQL Query Error:', err.message, '\nQuery:', text, '\nParams:', params);
      throw err;
    }
  }

  // Resilient fallback query executor
  return executeMockQuery(text, params);
}

// In-Memory Relational Emulator (Active ONLY when PostgreSQL is unreachable)
function executeMockQuery(text, params = []) {
  const normalized = text.trim();
  const lower = normalized.toLowerCase();

  // Simple SELECT from table
  for (const table of Object.keys(inMemoryStore)) {
    if (lower.startsWith('select') && lower.includes(`from ${table}`)) {
      let results = [...inMemoryStore[table]];
      return { rows: results, rowCount: results.length };
    }
  }

  return { rows: [], rowCount: 0 };
}
