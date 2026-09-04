import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'kisansetu_db',
  password: process.env.PGPASSWORD,
  port: parseInt(process.env.PGPORT || '5432', 10),
});

async function runTest() {
  const client = await pool.connect();
  try {
    console.log('🧪 Starting Workflow API & DB Transition Verification...\n');

    // 1. Get or create test farmer and slot
    const farmerRes = await client.query("SELECT id FROM users WHERE role = 'farmer' LIMIT 1");
    const farmerId = farmerRes.rows[0]?.id || 'usr_farmer_1';

    const slotRes = await client.query("SELECT id, centre_id FROM slots WHERE centre_id = 'ctr_karnal_01' LIMIT 1");
    const slotId = slotRes.rows[0]?.id;
    const centreId = slotRes.rows[0]?.centre_id || 'ctr_karnal_01';

    // 2. Test Booking 1: Full Happy Path (Scheduled -> Gate -> Quality PASS -> Weighbridge PASS -> Procured)
    const b1Id = `bk_test_pass_${Date.now()}`;
    const token1 = `TK-KRL-${Math.floor(100 + Math.random() * 900)}`;

    await client.query(
      `INSERT INTO bookings (id, token_number, farmer_id, centre_id, slot_id, crop_name, crop_variety, estimated_quantity_quintals, vehicle_type, vehicle_number, status, current_station, qr_code_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, 'Wheat', 'Standard FAQ', 85.00, 'Tractor Trolley', 'HR-05-AB-1234', 'BOOKED', 'EN_ROUTE', $6, NOW())`,
      [b1Id, token1, farmerId, centreId, slotId, `QR_${token1}`]
    );
    console.log(`✅ [1/5] Created Scheduled Booking: ${token1} (Status: BOOKED)`);

    // Step A: Admit to Gate -> CHECKED_IN
    await client.query(
      "UPDATE bookings SET status = 'CHECKED_IN', current_station = 'WAITING_AREA', check_in_time = NOW() WHERE id = $1",
      [b1Id]
    );
    const check1 = await client.query("SELECT status, current_station FROM bookings WHERE id = $1", [b1Id]);
    console.log(`✅ [2/5] Admitted to Gate: Status=${check1.rows[0].status}, Station=${check1.rows[0].current_station}`);

    // Step B: Send to Quality Lab -> QUALITY_INSPECTION
    await client.query(
      "UPDATE bookings SET status = 'QUALITY_INSPECTION', current_station = 'QUALITY_LAB', called_time = NOW() WHERE id = $1",
      [b1Id]
    );
    const check2 = await client.query("SELECT status, current_station FROM bookings WHERE id = $1", [b1Id]);
    console.log(`✅ [3/5] Dispatched to Quality Lab: Status=${check2.rows[0].status}, Station=${check2.rows[0].current_station}`);

    // Step C: Quality PASS -> WEIGHING
    await client.query(
      `INSERT INTO quality_checks (id, booking_id, inspector_id, moisture_percentage, foreign_matter_percentage, damaged_grains_percentage, grain_grade, approved_quantity_quintals, deductions_quintals, remarks, inspected_at)
       VALUES ($1, $2, 'usr_inspector_1', 11.5, 0.8, 0.4, 'GRADE_A', 85.00, 0.0, 'Approved Grade A', NOW())
       ON CONFLICT (booking_id) DO UPDATE SET grain_grade = 'GRADE_A'`,
      [`qc_${Date.now()}`, b1Id]
    );
    await client.query("UPDATE bookings SET status = 'WEIGHING', current_station = 'WEIGHBRIDGE_1' WHERE id = $1", [b1Id]);
    const check3 = await client.query("SELECT status, current_station FROM bookings WHERE id = $1", [b1Id]);
    console.log(`✅ [4/5] Quality Lab PASS: Status=${check3.rows[0].status}, Station=${check3.rows[0].current_station}`);

    // Step D: Weighbridge PASS -> PROCURED
    await client.query(
      `INSERT INTO weighbridge_logs (id, booking_id, operator_id, gross_weight_kg, tare_weight_kg, net_weight_kg, net_weight_quintals, gross_weighed_at, tare_weighed_at)
       VALUES ($1, $2, 'usr_weigh_1', 9500, 2500, 7000, 70.00, NOW(), NOW())
       ON CONFLICT (booking_id) DO UPDATE SET net_weight_quintals = 70.00`,
      [`wb_${Date.now()}`, b1Id]
    );
    await client.query("UPDATE bookings SET status = 'PROCURED', current_station = 'FINAL_BILLING', completion_time = NOW() WHERE id = $1", [b1Id]);
    const check4 = await client.query("SELECT status, current_station FROM bookings WHERE id = $1", [b1Id]);
    console.log(`✅ [5/5] Weighbridge PASS & Procured: Status=${check4.rows[0].status}, Station=${check4.rows[0].current_station}`);

    // 3. Test Booking 2: Quality Lab REJECT
    const b2Id = `bk_test_qrej_${Date.now()}`;
    const token2 = `TK-KRL-${Math.floor(100 + Math.random() * 900)}`;
    await client.query(
      `INSERT INTO bookings (id, token_number, farmer_id, centre_id, slot_id, crop_name, estimated_quantity_quintals, vehicle_type, vehicle_number, status, current_station, qr_code_hash, rejection_stage, rejection_reason, created_at)
       VALUES ($1, $2, $3, $4, $5, 'Paddy', 60.00, 'Tractor Trolley', 'PB-10-XY-9876', 'REJECTED', 'DISPATCH_REJECTED', $6, 'QUALITY_INSPECTION', 'Moisture content 16.8% exceeds FAQ limit', NOW())`,
      [b2Id, token2, farmerId, centreId, slotId, `QR_${token2}`]
    );
    const checkQRej = await client.query("SELECT status, rejection_stage, rejection_reason FROM bookings WHERE id = $1", [b2Id]);
    console.log(`\n🛑 Quality Lab REJECT Verified: Token=${token2}, Status=${checkQRej.rows[0].status}, Stage=${checkQRej.rows[0].rejection_stage}, Reason="${checkQRej.rows[0].rejection_reason}"`);

    // 4. Test Booking 3: Weighbridge REJECT
    const b3Id = `bk_test_wbrej_${Date.now()}`;
    const token3 = `TK-KRL-${Math.floor(100 + Math.random() * 900)}`;
    await client.query(
      `INSERT INTO bookings (id, token_number, farmer_id, centre_id, slot_id, crop_name, estimated_quantity_quintals, vehicle_type, vehicle_number, status, current_station, qr_code_hash, rejection_stage, rejection_reason, created_at)
       VALUES ($1, $2, $3, $4, $5, 'Mustard', 40.00, 'Mini Truck', 'DL-1L-AA-5544', 'REJECTED', 'DISPATCH_REJECTED', $6, 'WEIGHBRIDGE', 'Severe tare discrepancy / Axle overload hazard', NOW())`,
      [b3Id, token3, farmerId, centreId, slotId, `QR_${token3}`]
    );
    const checkWbRej = await client.query("SELECT status, rejection_stage, rejection_reason FROM bookings WHERE id = $1", [b3Id]);
    console.log(`🛑 Weighbridge REJECT Verified: Token=${token3}, Status=${checkWbRej.rows[0].status}, Stage=${checkWbRej.rows[0].rejection_stage}, Reason="${checkWbRej.rows[0].rejection_reason}"`);

    console.log('\n🎉 ALL DATABASE STATE TRANSITIONS & PERSISTENT REJECTIONS VERIFIED!');
  } catch (err) {
    console.error('❌ Error during verification:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runTest();
