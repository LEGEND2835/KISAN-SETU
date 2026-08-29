import bcrypt from 'bcryptjs';
import { inMemoryStore, isUsingMockStore, pool, query } from './index.js';

export async function runSeed() {
  console.log('🌱 Seeding KisanSetu SIH 2026 Database...');

  const passwordHashFarmer = await bcrypt.hash('farmer123', 8);
  const passwordHashOfficer = await bcrypt.hash('admin123', 8);

  const usersData = [
    {
      id: 'usr_farmer_1',
      full_name: 'Ramesh Kumar',
      phone: '9876543210',
      email: 'ramesh.farmer@example.com',
      role: 'farmer',
      password_hash: passwordHashFarmer,
      state: 'Haryana',
      district: 'Karnal',
      village: 'Taraori',
      aadhaar_last4: '4821',
      bank_account_last4: '9012',
      ifsc_code: 'SBIN0001234',
    },
    {
      id: 'usr_farmer_2',
      full_name: 'Gurpreet Singh',
      phone: '9876543211',
      email: 'gurpreet.singh@example.com',
      role: 'farmer',
      state: 'Punjab',
      district: 'Ludhiana',
      village: 'Samrala',
      password_hash: passwordHashFarmer,
      aadhaar_last4: '7193',
      bank_account_last4: '4451',
      ifsc_code: 'PUNB0102030',
    },
    {
      id: 'usr_farmer_3',
      full_name: 'Suresh Choudhary',
      phone: '9876543212',
      email: 'suresh.c@example.com',
      role: 'farmer',
      state: 'Rajasthan',
      district: 'Kota',
      village: 'Digod',
      password_hash: passwordHashFarmer,
      aadhaar_last4: '8820',
      bank_account_last4: '1129',
      ifsc_code: 'BARB0KOTAAX',
    },
    {
      id: 'usr_officer_1',
      full_name: 'Rajesh Sharma (Supervisor)',
      phone: '9876543220',
      email: 'rajesh.mandi@gov.in',
      role: 'centre_officer',
      password_hash: passwordHashOfficer,
      state: 'Haryana',
      district: 'Karnal',
      village: 'Sector 4 Mandi Complex',
      aadhaar_last4: '1092',
      bank_account_last4: '0000',
      ifsc_code: 'SBIN0001000',
    },
    {
      id: 'usr_inspector_1',
      full_name: 'Dr. Sunita Verma (Quality Analyst)',
      phone: '9876543230',
      email: 'sunita.quality@gov.in',
      role: 'quality_inspector',
      password_hash: passwordHashOfficer,
      state: 'Haryana',
      district: 'Karnal',
      village: 'Mandi Quality Lab',
      aadhaar_last4: '3310',
      bank_account_last4: '0000',
      ifsc_code: 'SBIN0001000',
    },
    {
      id: 'usr_weigh_1',
      full_name: 'Amit Patel (Weighbridge In-charge)',
      phone: '9876543240',
      email: 'amit.weigh@gov.in',
      role: 'weighbridge_operator',
      password_hash: passwordHashOfficer,
      state: 'Haryana',
      district: 'Karnal',
      village: 'Weighbridge Bay 1',
      aadhaar_last4: '5540',
      bank_account_last4: '0000',
      ifsc_code: 'SBIN0001000',
    },
  ];

  const centresData = [
    {
      id: 'ctr_karnal_01',
      name: 'Karnal Mega Grain Mandi Hub',
      code: 'MND-KRL-01',
      state: 'Haryana',
      district: 'Karnal',
      address: 'Near GT Road, Mandi Complex, Karnal, Haryana 132001',
      latitude: 29.6857,
      longitude: 76.9905,
      daily_capacity_quintals: 8000,
      max_concurrent_trucks: 16,
      supported_crops: JSON.stringify(['Wheat', 'Paddy (Basmati)', 'Paddy (PR)', 'Mustard', 'Gram']),
      is_active: true,
      manager_id: 'usr_officer_1',
    },
    {
      id: 'ctr_khanna_01',
      name: 'Khanna Asia Grain Terminal',
      code: 'MND-KHN-01',
      state: 'Punjab',
      district: 'Ludhiana',
      address: 'Main Grain Market Yard, Khanna, Punjab 141401',
      latitude: 30.7071,
      longitude: 76.2167,
      daily_capacity_quintals: 12000,
      max_concurrent_trucks: 24,
      supported_crops: JSON.stringify(['Wheat', 'Paddy', 'Maize', 'Sunflower']),
      is_active: true,
      manager_id: null,
    },
    {
      id: 'ctr_kota_01',
      name: 'Kota Agro Procurement Yard',
      code: 'MND-KTA-01',
      state: 'Rajasthan',
      district: 'Kota',
      address: 'Bhamashah Krishi Upaj Mandi, Kota, Rajasthan 324005',
      latitude: 25.1800,
      longitude: 75.8300,
      daily_capacity_quintals: 6500,
      max_concurrent_trucks: 12,
      supported_crops: JSON.stringify(['Wheat', 'Soybean', 'Mustard', 'Coriander', 'Gram']),
      is_active: true,
      manager_id: null,
    },
    {
      id: 'ctr_nizamabad_01',
      name: 'Nizamabad Agricultural Market Yard',
      code: 'MND-NZB-01',
      state: 'Telangana',
      district: 'Nizamabad',
      address: 'Agriculture Market Committee, Nizamabad, Telangana 503001',
      latitude: 18.6725,
      longitude: 78.0941,
      daily_capacity_quintals: 7000,
      max_concurrent_trucks: 14,
      supported_crops: JSON.stringify(['Paddy', 'Turmeric', 'Maize', 'Soybean']),
      is_active: true,
      manager_id: null,
    },
  ];

  // Generate Slots for Today and Next 3 Days
  const slotsData = [];
  const today = new Date();
  const timeSlots = [
    { start: '08:00', end: '10:00' },
    { start: '10:00', end: '12:00' },
    { start: '12:00', end: '14:00' },
    { start: '14:00', end: '16:00' },
    { start: '16:00', end: '18:00' },
  ];

  for (let d = 0; d < 4; d++) {
    const slotDateObj = new Date();
    slotDateObj.setDate(today.getDate() + d);
    const dateStr = slotDateObj.toISOString().split('T')[0];

    for (const centre of centresData) {
      timeSlots.forEach((ts, idx) => {
        slotsData.push({
          id: `slt_${centre.code.toLowerCase()}_${dateStr}_${idx + 1}`,
          centre_id: centre.id,
          slot_date: dateStr,
          start_time: ts.start,
          end_time: ts.end,
          max_capacity_quintals: 1500,
          booked_capacity_quintals: d === 0 ? 650 + idx * 80 : 200,
          max_tokens: 25,
          booked_tokens: d === 0 ? 8 + idx * 2 : 2,
          status: 'OPEN',
        });
      });
    }
  }

  // Pre-populate Bookings with Active Queue Stages for Demo
  const activeSlot = slotsData[0];

  const bookingsData = [
    {
      id: 'bk_001',
      token_number: 'TK-101',
      farmer_id: 'usr_farmer_1',
      centre_id: 'ctr_karnal_01',
      slot_id: activeSlot.id,
      crop_name: 'Wheat',
      crop_variety: 'HD-2967 (Grade A)',
      estimated_quantity_quintals: 65.0,
      vehicle_type: 'Tractor Trolley',
      vehicle_number: 'HR-05-AB-4412',
      status: 'WEIGHING',
      current_station: 'WEIGHBRIDGE_1',
      qr_code_hash: 'QR_TK_101_HR05AB4412',
      check_in_time: new Date(Date.now() - 45 * 60000).toISOString(),
      called_time: new Date(Date.now() - 15 * 60000).toISOString(),
      completion_time: null,
    },
    {
      id: 'bk_002',
      token_number: 'TK-102',
      farmer_id: 'usr_farmer_2',
      centre_id: 'ctr_karnal_01',
      slot_id: activeSlot.id,
      crop_name: 'Wheat',
      crop_variety: 'PBW-502',
      estimated_quantity_quintals: 80.0,
      vehicle_type: 'Mini Truck (Tata 407)',
      vehicle_number: 'PB-10-XY-9081',
      status: 'QUALITY_INSPECTION',
      current_station: 'QUALITY_LAB',
      qr_code_hash: 'QR_TK_102_PB10XY9081',
      check_in_time: new Date(Date.now() - 30 * 60000).toISOString(),
      called_time: new Date(Date.now() - 8 * 60000).toISOString(),
      completion_time: null,
    },
    {
      id: 'bk_003',
      token_number: 'TK-103',
      farmer_id: 'usr_farmer_3',
      centre_id: 'ctr_karnal_01',
      slot_id: activeSlot.id,
      crop_name: 'Mustard',
      crop_variety: 'Pusa Bold',
      estimated_quantity_quintals: 45.0,
      vehicle_type: 'Tractor Trolley',
      vehicle_number: 'RJ-20-K-7711',
      status: 'CALLED',
      current_station: 'GATE_BAY_1',
      qr_code_hash: 'QR_TK_103_RJ20K7711',
      check_in_time: new Date(Date.now() - 20 * 60000).toISOString(),
      called_time: new Date(Date.now() - 2 * 60000).toISOString(),
      completion_time: null,
    },
    {
      id: 'bk_004',
      token_number: 'TK-104',
      farmer_id: 'usr_farmer_1',
      centre_id: 'ctr_karnal_01',
      slot_id: activeSlot.id,
      crop_name: 'Wheat',
      crop_variety: 'DBW-187 (Karan Vandana)',
      estimated_quantity_quintals: 95.0,
      vehicle_type: 'Tractor Trolley',
      vehicle_number: 'HR-05-CD-3321',
      status: 'CHECKED_IN',
      current_station: 'WAITING_AREA',
      qr_code_hash: 'QR_TK_104_HR05CD3321',
      check_in_time: new Date(Date.now() - 10 * 60000).toISOString(),
      called_time: null,
      completion_time: null,
    },
    {
      id: 'bk_005',
      token_number: 'TK-105',
      farmer_id: 'usr_farmer_2',
      centre_id: 'ctr_karnal_01',
      slot_id: activeSlot.id,
      crop_name: 'Wheat',
      crop_variety: 'HD-3086',
      estimated_quantity_quintals: 50.0,
      vehicle_type: 'Tractor Trolley',
      vehicle_number: 'PB-11-M-2299',
      status: 'BOOKED',
      current_station: 'EN_ROUTE',
      qr_code_hash: 'QR_TK_105_PB11M2299',
      check_in_time: null,
      called_time: null,
      completion_time: null,
    },
  ];

  // Quality checks for in-progress & completed
  const qualityData = [
    {
      id: 'qc_001',
      booking_id: 'bk_001',
      inspector_id: 'usr_inspector_1',
      moisture_percentage: 11.4,
      foreign_matter_percentage: 0.6,
      damaged_grains_percentage: 0.2,
      grain_grade: 'GRADE_A',
      approved_quantity_quintals: 65.0,
      deductions_quintals: 0.0,
      remarks: 'Prime Quality Grain, Optimal moisture level.',
      inspected_at: new Date(Date.now() - 25 * 60000).toISOString(),
    },
    {
      id: 'qc_002',
      booking_id: 'bk_002',
      inspector_id: 'usr_inspector_1',
      moisture_percentage: 12.8,
      foreign_matter_percentage: 1.1,
      damaged_grains_percentage: 0.8,
      grain_grade: 'FAQ',
      approved_quantity_quintals: 78.5,
      deductions_quintals: 1.5,
      remarks: 'Standard FAQ Quality, 1.5 Qtl deduction for chaff.',
      inspected_at: new Date(Date.now() - 5 * 60000).toISOString(),
    },
  ];

  // Weighbridge logs
  const weighbridgeData = [
    {
      id: 'wb_001',
      booking_id: 'bk_001',
      operator_id: 'usr_weigh_1',
      gross_weight_kg: 9240,
      tare_weight_kg: 2740,
      net_weight_kg: 6500,
      net_weight_quintals: 65.0,
      gross_weighed_at: new Date(Date.now() - 10 * 60000).toISOString(),
      tare_weighed_at: new Date(Date.now() - 2 * 60000).toISOString(),
    },
  ];

  // Payment record
  const paymentsData = [
    {
      id: 'pay_001',
      booking_id: 'bk_001',
      receipt_number: 'JFORM-2026-TK-101',
      msp_rate_per_quintal: 2275.0,
      gross_amount: 147875.0,
      deductions_amount: 0.0,
      net_payable_amount: 147875.0,
      payment_status: 'PROCESSING',
      transaction_ref: 'DBT-GOI-2026-98127391',
      bank_account_last4: '9012',
      ifsc_code: 'SBIN0001234',
    },
  ];

  // Always update inMemoryStore for fallback synchronization
  inMemoryStore.users = usersData;
  inMemoryStore.centres = centresData;
  inMemoryStore.slots = slotsData;
  inMemoryStore.bookings = bookingsData;
  inMemoryStore.quality_checks = qualityData;
  inMemoryStore.weighbridge_logs = weighbridgeData;
  inMemoryStore.payments = paymentsData;

  // Insert / Upsert into PostgreSQL tables if connected
  if (!isUsingMockStore && pool) {
    try {
      for (const u of usersData) {
        await pool.query(
          `INSERT INTO users (id, full_name, phone, email, role, password_hash, state, district, village, aadhaar_last4, bank_account_last4, ifsc_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash`,
          [u.id, u.full_name, u.phone, u.email, u.role, u.password_hash, u.state, u.district, u.village, u.aadhaar_last4, u.bank_account_last4, u.ifsc_code]
        );
      }

      for (const c of centresData) {
        await pool.query(
          `INSERT INTO centres (id, name, code, state, district, address, latitude, longitude, daily_capacity_quintals, max_concurrent_trucks, supported_crops, is_active, manager_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address`,
          [c.id, c.name, c.code, c.state, c.district, c.address, c.latitude, c.longitude, c.daily_capacity_quintals, c.max_concurrent_trucks, c.supported_crops, c.is_active, c.manager_id]
        );
      }

      for (const s of slotsData) {
        await pool.query(
          `INSERT INTO slots (id, centre_id, slot_date, start_time, end_time, max_capacity_quintals, booked_capacity_quintals, max_tokens, booked_tokens, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (centre_id, slot_date, start_time, end_time) DO UPDATE SET booked_tokens = EXCLUDED.booked_tokens, booked_capacity_quintals = EXCLUDED.booked_capacity_quintals`,
          [s.id, s.centre_id, s.slot_date, s.start_time, s.end_time, s.max_capacity_quintals, s.booked_capacity_quintals, s.max_tokens, s.booked_tokens, s.status]
        );
      }

      for (const b of bookingsData) {
        await pool.query(
          `INSERT INTO bookings (id, token_number, farmer_id, centre_id, slot_id, crop_name, crop_variety, estimated_quantity_quintals, vehicle_type, vehicle_number, status, current_station, qr_code_hash, check_in_time, called_time, completion_time)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (token_number) DO UPDATE SET status = EXCLUDED.status, current_station = EXCLUDED.current_station, check_in_time = EXCLUDED.check_in_time, called_time = EXCLUDED.called_time`,
          [b.id, b.token_number, b.farmer_id, b.centre_id, b.slot_id, b.crop_name, b.crop_variety, b.estimated_quantity_quintals, b.vehicle_type, b.vehicle_number, b.status, b.current_station, b.qr_code_hash, b.check_in_time, b.called_time, b.completion_time]
        );
      }

      for (const q of qualityData) {
        await pool.query(
          `INSERT INTO quality_checks (id, booking_id, inspector_id, moisture_percentage, foreign_matter_percentage, damaged_grains_percentage, grain_grade, approved_quantity_quintals, deductions_quintals, remarks, inspected_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (booking_id) DO UPDATE SET grain_grade = EXCLUDED.grain_grade, moisture_percentage = EXCLUDED.moisture_percentage`,
          [q.id, q.booking_id, q.inspector_id, q.moisture_percentage, q.foreign_matter_percentage, q.damaged_grains_percentage, q.grain_grade, q.approved_quantity_quintals, q.deductions_quintals, q.remarks, q.inspected_at]
        );
      }

      for (const w of weighbridgeData) {
        await pool.query(
          `INSERT INTO weighbridge_logs (id, booking_id, operator_id, gross_weight_kg, tare_weight_kg, net_weight_kg, net_weight_quintals, gross_weighed_at, tare_weighed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (booking_id) DO UPDATE SET gross_weight_kg = EXCLUDED.gross_weight_kg, tare_weight_kg = EXCLUDED.tare_weight_kg, net_weight_quintals = EXCLUDED.net_weight_quintals`,
          [w.id, w.booking_id, w.operator_id, w.gross_weight_kg, w.tare_weight_kg, w.net_weight_kg, w.net_weight_quintals, w.gross_weighed_at, w.tare_weighed_at]
        );
      }

      for (const p of paymentsData) {
        await pool.query(
          `INSERT INTO payments (id, booking_id, receipt_number, msp_rate_per_quintal, gross_amount, deductions_amount, net_payable_amount, payment_status, transaction_ref, bank_account_last4, ifsc_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (booking_id) DO UPDATE SET payment_status = EXCLUDED.payment_status, net_payable_amount = EXCLUDED.net_payable_amount`,
          [p.id, p.booking_id, p.receipt_number, p.msp_rate_per_quintal, p.gross_amount, p.deductions_amount, p.net_payable_amount, p.payment_status, p.transaction_ref, p.bank_account_last4, p.ifsc_code]
        );
      }

      console.log('✅ [PostgreSQL 18] All seed tables populated and synced with database.');
    } catch (e) {
      console.error('❌ PostgreSQL Seed Error:', e.message);
    }
  }

  console.log(`✅ Seed ready: ${usersData.length} Users, ${centresData.length} Mandi Centres, ${slotsData.length} Slots, ${bookingsData.length} Live Queue Tokens.`);
}
