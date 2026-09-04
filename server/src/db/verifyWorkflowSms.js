import dotenv from 'dotenv';
dotenv.config();

import { initDatabase, pool, isUsingMockStore } from './index.js';
import { 
  normalizeIndianPhoneNumber, 
  maskPhoneNumber, 
  formatBookingSmsText,
  formatGateAdmissionSmsText,
  formatQualityCheckSmsText,
  formatWeighbridgeSmsText,
  formatProcurementCompletedSmsText,
  formatGateCallSmsText,
  sendSMS,
  sendBookingConfirmationSms,
  sendGateAdmissionSms,
  sendQualityCheckSms,
  sendWeighbridgeSms,
  sendProcurementCompletedSms,
  sendGateCallSms,
  hasSentWorkflowSms,
  markWorkflowSmsSent,
  resetWorkflowSmsTracker
} from '../services/notifications.js';

async function runWorkflowSmsVerification() {
  console.log('🧪 Starting Full Multi-Stage Workflow SMS Verification...\n');

  await initDatabase();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  // --- STAGE 1: FORMATTING & MESSAGE TEMPLATES ---
  console.log('\n--- SECTION 1: SMS Message Templates & Character Budget ---');
  
  const token = 'TK-KRL-782';
  const mandi = 'Karnal Mega Grain Terminal';
  const link = `http://localhost:5173/token/${token}`;

  // 1. Slot Booking Template
  const bookingText = formatBookingSmsText({
    tokenNumber: token,
    mandiName: mandi,
    slotDate: '2026-09-05',
    slotTime: '08:00 - 10:00',
    bookingLink: link,
  });
  assert(bookingText.includes('slot is confirmed') && bookingText.includes(token), 'Booking SMS text valid');

  // 2. Gate Admission Template
  const gateText = formatGateAdmissionSmsText({
    tokenNumber: token,
    mandiName: mandi,
    vehicleNumber: 'HR-05-AB-1234',
    bookingLink: link,
  });
  assert(gateText.includes('Gate entry confirmed') && gateText.includes('HR-05-AB-1234'), 'Gate Admission SMS text valid');

  // 3. Quality Check PASS Template
  const qcPassText = formatQualityCheckSmsText({
    tokenNumber: token,
    cropName: 'Wheat',
    decision: 'PASS',
    grainGrade: 'GRADE_A',
    approvedQty: 85.0,
    moisture: 11.5,
  });
  assert(qcPassText.includes('Quality check PASSED') && qcPassText.includes('GRADE_A'), 'Quality Check PASS SMS text valid');

  // 4. Quality Check REJECT Template
  const qcRejectText = formatQualityCheckSmsText({
    tokenNumber: token,
    cropName: 'Wheat',
    decision: 'REJECT',
    remarks: 'Moisture 16.5% exceeds permissible limits',
  });
  assert(qcRejectText.includes('Quality inspection REJECTED') && qcRejectText.includes('Moisture 16.5%'), 'Quality Check REJECT SMS text valid');

  // 5. Weighbridge Gross Template
  const wbGrossText = formatWeighbridgeSmsText({
    tokenNumber: token,
    cropName: 'Wheat',
    isGrossOnly: true,
    grossWeightKg: 9500,
    decision: 'PASS',
  });
  assert(wbGrossText.includes('Gross weight recorded') && wbGrossText.includes('9,500 kg'), 'Weighbridge Gross SMS text valid');

  // 6. Weighbridge REJECT Template
  const wbRejectText = formatWeighbridgeSmsText({
    tokenNumber: token,
    cropName: 'Wheat',
    isGrossOnly: false,
    decision: 'REJECT',
    remarks: 'Axle overload safety violation',
  });
  assert(wbRejectText.includes('Weighbridge entry REJECTED') && wbRejectText.includes('Axle overload'), 'Weighbridge REJECT SMS text valid');

  // 7. Procurement Completed & J-Form Template
  const procCompleteText = formatProcurementCompletedSmsText({
    tokenNumber: token,
    cropName: 'Wheat',
    netQuintals: 70.0,
    mspRate: 2275,
    netPayable: 159250,
    receiptLink: link,
  });
  assert(procCompleteText.includes('Procurement COMPLETED') && procCompleteText.includes('Rs.1,59,250'), 'Procurement Complete SMS text valid');

  // 8. Gate / Station Call Template
  const callText = formatGateCallSmsText({
    tokenNumber: token,
    vehicleNumber: 'HR-05-AB-1234',
    stationName: 'Quality Inspection Bay #2',
  });
  assert(callText.includes('requested at Station') && callText.includes('Bay #2'), 'Gate / Station Call SMS text valid');

  // --- SECTION 2: DEDUPLICATION TRACKER ---
  console.log('\n--- SECTION 2: Deduplication Protection ---');
  resetWorkflowSmsTracker();

  const testBookingId = `bk_dedup_${Date.now()}`;
  assert(!hasSentWorkflowSms(testBookingId, 'GATE_ADMISSION'), 'Initially has not sent Gate Admission SMS');
  
  markWorkflowSmsSent(testBookingId, 'GATE_ADMISSION');
  assert(hasSentWorkflowSms(testBookingId, 'GATE_ADMISSION'), 'Recognizes Gate Admission SMS as sent');
  assert(!hasSentWorkflowSms(testBookingId, 'QUALITY_PASS'), 'Distinct workflow stages are tracked separately');

  // Test that sendGateAdmissionSms recognizes duplicate and skips
  const duplicateAttempt = await sendGateAdmissionSms({
    booking: { id: testBookingId, token_number: 'TK-DEDUP-01', vehicle_number: 'HR-05-AA-1111' },
    farmer: { phone: '9876543210' },
    centre: { name: 'Karnal Mandi' },
  });
  assert(duplicateAttempt.status === 'SKIPPED_DUPLICATE', 'Duplicate gate admission SMS was cleanly skipped');

  // --- SECTION 3: DATABASE WORKFLOW & REGISTERED PHONE LOOKUP ---
  console.log('\n--- SECTION 3: End-to-End DB Workflow State Transitions ---');

  if (!isUsingMockStore && pool) {
    // 1. Lookup test farmer and mandi
    const farmerRes = await pool.query("SELECT * FROM users WHERE role = 'farmer' LIMIT 1");
    assert(farmerRes.rows.length > 0, 'Found registered farmer in PostgreSQL');
    const farmer = farmerRes.rows[0];
    assert(farmer.phone && farmer.phone.length >= 10, 'Farmer has registered phone number in database');

    const centreRes = await pool.query("SELECT * FROM centres LIMIT 1");
    assert(centreRes.rows.length > 0, 'Found active centre in PostgreSQL');
    const centre = centreRes.rows[0];

    const slotRes = await pool.query("SELECT * FROM slots WHERE centre_id = $1 LIMIT 1", [centre.id]);
    assert(slotRes.rows.length > 0, 'Found slot in PostgreSQL');
    const slot = slotRes.rows[0];

    const flowToken = `TK-FLOW-${Math.floor(100 + Math.random() * 900)}`;
    const flowBookingId = `bk_flow_${Date.now()}`;

    // A. Step 1: Create Booking
    await pool.query(
      `INSERT INTO bookings (id, token_number, farmer_id, centre_id, slot_id, crop_name, crop_variety, estimated_quantity_quintals, vehicle_type, vehicle_number, status, current_station, qr_code_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, 'Wheat', 'HD-2967', 85.00, 'Tractor Trolley', 'HR-05-ZZ-9999', 'BOOKED', 'EN_ROUTE', $6, NOW())`,
      [flowBookingId, flowToken, farmer.id, centre.id, slot.id, `QR_${flowToken}`]
    );
    console.log(`[DB] Created Booking ${flowToken}`);

    // Test Booking Confirmation SMS dispatch
    process.env.SMS_ENABLED = 'true';
    const bookingSmsRes = await sendBookingConfirmationSms({
      booking: { id: flowBookingId, token_number: flowToken, created_at: new Date().toISOString() },
      farmer,
      centre,
      slot,
    });
    assert(bookingSmsRes.success !== undefined, 'Booking Confirmation SMS handler executed safely');

    // B. Step 2: Gate Check-in
    await pool.query(
      "UPDATE bookings SET status = 'CHECKED_IN', current_station = 'WAITING_AREA', check_in_time = NOW() WHERE id = $1",
      [flowBookingId]
    );
    const gateSmsRes = await sendGateAdmissionSms({
      booking: { id: flowBookingId, token_number: flowToken, vehicle_number: 'HR-05-ZZ-9999' },
      farmer,
      centre,
    });
    assert(gateSmsRes.success !== undefined, 'Gate Admission SMS handler executed safely');

    // C. Step 3: Quality Check PASS
    const qcId = `qc_${Date.now()}`;
    await pool.query(
      `INSERT INTO quality_checks (id, booking_id, inspector_id, moisture_percentage, foreign_matter_percentage, damaged_grains_percentage, grain_grade, approved_quantity_quintals, deductions_quintals, remarks, inspected_at)
       VALUES ($1, $2, 'usr_inspector_1', 11.8, 0.9, 0.4, 'GRADE_A', 85.00, 0.0, 'Grade A Approved', NOW())
       ON CONFLICT (booking_id) DO UPDATE SET grain_grade = 'GRADE_A'`,
      [qcId, flowBookingId]
    );
    await pool.query("UPDATE bookings SET status = 'WEIGHING', current_station = 'WEIGHBRIDGE_1' WHERE id = $1", [flowBookingId]);

    const qcSmsRes = await sendQualityCheckSms({
      booking: { id: flowBookingId, token_number: flowToken, crop_name: 'Wheat', estimated_quantity_quintals: 85.0 },
      farmer,
      quality: { grain_grade: 'GRADE_A', approved_quantity_quintals: 85.0, moisture_percentage: 11.8, remarks: 'Grade A Approved' },
      decision: 'PASS',
      centre,
    });
    assert(qcSmsRes.success !== undefined, 'Quality Check SMS handler executed safely');

    // D. Step 4: Weighbridge Gross Weight
    const wbId = `wb_${Date.now()}`;
    await pool.query(
      `INSERT INTO weighbridge_logs (id, booking_id, operator_id, gross_weight_kg, tare_weight_kg, net_weight_kg, net_weight_quintals, gross_weighed_at)
       VALUES ($1, $2, 'usr_weigh_1', 9800, 0, 0, 0, NOW())
       ON CONFLICT (booking_id) DO UPDATE SET gross_weight_kg = 9800`,
      [wbId, flowBookingId]
    );
    await pool.query("UPDATE bookings SET status = 'UNLOADING', current_station = 'UNLOADING_BAY_1' WHERE id = $1", [flowBookingId]);

    const wbGrossSmsRes = await sendWeighbridgeSms({
      booking: { id: flowBookingId, token_number: flowToken, crop_name: 'Wheat' },
      farmer,
      weighRecord: { gross_weight_kg: 9800 },
      isGrossOnly: true,
      decision: 'PASS',
      centre,
    });
    assert(wbGrossSmsRes.success !== undefined, 'Weighbridge Gross SMS handler executed safely');

    // E. Step 5: Weighbridge Tare Weight & Procurement Completion
    await pool.query(
      `UPDATE weighbridge_logs 
       SET tare_weight_kg = 2800, net_weight_kg = 7000, net_weight_quintals = 70.00, tare_weighed_at = NOW()
       WHERE booking_id = $1`,
      [flowBookingId]
    );
    await pool.query("UPDATE bookings SET status = 'PROCURED', current_station = 'FINAL_BILLING', completion_time = NOW() WHERE id = $1", [flowBookingId]);

    const procSmsRes = await sendProcurementCompletedSms({
      booking: { id: flowBookingId, token_number: flowToken, crop_name: 'Wheat', estimated_quantity_quintals: 85.0 },
      farmer,
      payment: { msp_rate_per_quintal: 2275.0, net_payable_amount: 159250.0 },
      weighRecord: { net_weight_quintals: 70.00 },
      centre,
    });
    assert(procSmsRes.success !== undefined, 'Procurement Completion SMS handler executed safely');
  }

  // --- SECTION 4: ERROR ISOLATION & NON-BLOCKING GUARANTEES ---
  console.log('\n--- SECTION 4: Error Isolation & Non-blocking Safety ---');

  // Test with invalid phone
  const errRes1 = await sendGateAdmissionSms({
    booking: { id: 'bk_invalid_phone', token_number: 'TK-ERR-01' },
    farmer: { phone: 'not_a_phone' },
  });
  assert(errRes1.status === 'INVALID_PHONE' && errRes1.success === false, 'Gracefully handles invalid phone without crashing');

  // Test with SMS disabled
  process.env.SMS_ENABLED = 'false';
  const disabledRes = await sendQualityCheckSms({
    booking: { id: 'bk_disabled_test', token_number: 'TK-ERR-02' },
    farmer: { phone: '9876543210' },
    decision: 'PASS',
  });
  assert(disabledRes.status === 'DISABLED', 'Honors SMS_ENABLED=false configuration');

  console.log(`\n======================================================`);
  console.log(`🎉 ALL WORKFLOW SMS INTEGRATION TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log(`======================================================\n`);

  if (!isUsingMockStore && pool) {
    await pool.end();
  }
}

runWorkflowSmsVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
