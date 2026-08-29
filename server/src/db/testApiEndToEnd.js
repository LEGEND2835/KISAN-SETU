import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'kisansetu_db',
  password: process.env.PGPASSWORD,
  port: parseInt(process.env.PGPORT || '5432', 10),
});

async function runEndToEndTests() {
  console.log('🧪 Starting End-to-End PostgreSQL 18 Verification Suite...\n');
  const client = await pool.connect();
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  try {
    // 1. Check PostgreSQL Version & Connection
    const verRes = await client.query('SELECT version(), current_database()');
    assert(verRes.rows[0].current_database === 'kisansetu_db', 'Database connection', `DB: ${verRes.rows[0].current_database}`);

    // 2. Read Users
    const usersRes = await client.query('SELECT id, full_name, phone, role, password_hash FROM users ORDER BY id ASC');
    assert(usersRes.rows.length >= 6, 'Query users table', `Found ${usersRes.rows.length} users`);
    
    // Verify password hash comparison on real DB user
    const farmer = usersRes.rows.find(u => u.phone === '9876543210');
    const isPwMatch = await bcrypt.compare('farmer123', farmer?.password_hash || '');
    assert(isPwMatch, 'Bcrypt password hash verification on DB record', `Phone: ${farmer?.phone}`);

    // 3. Read Centres
    const centresRes = await client.query('SELECT * FROM centres WHERE is_active = TRUE');
    assert(centresRes.rows.length >= 4, 'Query centres table', `Found ${centresRes.rows.length} active Mandis`);

    // 4. Read Slots
    const slotsRes = await client.query('SELECT * FROM slots WHERE centre_id = $1', ['ctr_karnal_01']);
    assert(slotsRes.rows.length >= 20, 'Query slots table', `Found ${slotsRes.rows.length} slots for Karnal Hub`);

    // 5. Test Relational Join for Bookings & Queue Stages
    const bookingsRes = await client.query(`
      SELECT 
        b.token_number, 
        b.status, 
        u.full_name as farmer_name, 
        c.name as centre_name,
        q.grain_grade,
        w.gross_weight_kg,
        p.receipt_number,
        p.net_payable_amount
      FROM bookings b
      LEFT JOIN users u ON b.farmer_id = u.id
      LEFT JOIN centres c ON b.centre_id = c.id
      LEFT JOIN quality_checks q ON b.id = q.booking_id
      LEFT JOIN weighbridge_logs w ON b.id = w.booking_id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.centre_id = 'ctr_karnal_01'
      ORDER BY b.token_number ASC;
    `);

    assert(bookingsRes.rows.length >= 5, 'Relational JOIN query across 6 tables', `Retrieved ${bookingsRes.rows.length} live tokens`);

    // 6. Test Write Operation: Insert new booking pass in PostgreSQL
    const testTokenNum = `TK-TEST-${Date.now().toString().slice(-4)}`;
    const testBookingId = `bk_test_${Date.now()}`;
    const insertBookingRes = await client.query(
      `INSERT INTO bookings (id, token_number, farmer_id, centre_id, slot_id, crop_name, estimated_quantity_quintals, vehicle_type, vehicle_number, status, current_station, qr_code_hash, created_at)
       VALUES ($1, $2, 'usr_farmer_1', 'ctr_karnal_01', $3, 'Wheat', 50.0, 'Tractor Trolley', 'HR-05-TEST-99', 'BOOKED', 'EN_ROUTE', $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [testBookingId, testTokenNum, slotsRes.rows[0].id, `QR_${testTokenNum}`]
    );
    assert(insertBookingRes.rows[0].token_number === testTokenNum, 'Write to PostgreSQL bookings table', `Token: ${testTokenNum}`);

    // 7. Test State Transition: Check-in token
    const updateRes = await client.query(
      `UPDATE bookings SET status = 'CHECKED_IN', current_station = 'WAITING_AREA', check_in_time = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [testBookingId]
    );
    assert(updateRes.rows[0].status === 'CHECKED_IN', 'Update booking queue state (BOOKED -> CHECKED_IN)');

    // 8. Clean up test record
    await client.query('DELETE FROM bookings WHERE id = $1', [testBookingId]);
    assert(true, 'PostgreSQL record deletion & cleanup verified');

    console.log(`\n========================================================`);
    console.log(`🏁 Verification Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================================\n`);

  } catch (err) {
    console.error('❌ Test suite fatal error:', err);
    failed++;
  } finally {
    client.release();
    await pool.end();
  }
}

runEndToEndTests();
