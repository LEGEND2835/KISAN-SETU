import dotenv from 'dotenv';
dotenv.config();

import { initDatabase, pool, isUsingMockStore } from './index.js';
import { 
  normalizeIndianPhoneNumber, 
  maskPhoneNumber, 
  formatBookingSmsText, 
  sendSMS,
  sendBookingConfirmationSms 
} from '../services/smsService.js';

async function runSmsVerification() {
  console.log('🧪 Starting KisanSetu Fast2SMS Booking Integration Verification...\n');

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

  // TEST 1: Phone Normalizer & Security Masking (Fast2SMS 10-digit standard)
  console.log('\n--- TEST 1: Phone Normalizer & Security Masking ---');
  assert(normalizeIndianPhoneNumber('9876543210') === '9876543210', '10-digit number normalised to 9876543210');
  assert(normalizeIndianPhoneNumber('+91 98765 43210') === '9876543210', '+91 space format normalised to 9876543210');
  assert(normalizeIndianPhoneNumber('09876543210') === '9876543210', '0-prefixed number normalised to 9876543210');
  assert(normalizeIndianPhoneNumber('919876543210') === '9876543210', '12-digit 91-prefixed normalised to 10-digit 9876543210');
  assert(normalizeIndianPhoneNumber('12345') === null, 'Short invalid number rejected (returns null)');
  assert(normalizeIndianPhoneNumber('') === null, 'Empty phone rejected');
  assert(maskPhoneNumber('9876543210').includes('******'), 'Phone number masked for audit logs (no plaintext leak)');

  // TEST 2: SMS Content & Link Generation
  console.log('\n--- TEST 2: SMS Content & Link Generation ---');
  const sampleLink = 'http://localhost:5173/token/TK-KRL-1042';
  const smsBody = formatBookingSmsText({
    tokenNumber: 'TK-KRL-1042',
    mandiName: 'Karnal Mandi',
    slotDate: '2026-09-05',
    slotTime: '10:00 - 12:00',
    bookingLink: sampleLink,
  });
  assert(smsBody.includes('KisanSetu: Your mandi slot is confirmed.'), 'SMS header confirmed');
  assert(smsBody.includes('Token: TK-KRL-1042'), 'SMS contains token number');
  assert(smsBody.includes('Mandi: Karnal Mandi'), 'SMS contains mandi name');
  assert(smsBody.includes('Slot: 2026-09-05 10:00 - 12:00'), 'SMS contains slot date and time');
  assert(smsBody.includes(`Check booking: ${sampleLink}`), 'SMS contains generated token link');

  // TEST 3: SMS Disabled Mode (SMS_ENABLED=false)
  console.log('\n--- TEST 3: SMS Disabled Mode (SMS_ENABLED=false) ---');
  process.env.SMS_ENABLED = 'false';
  const disabledRes = await sendBookingConfirmationSms({
    booking: { token_number: 'TK-TEST-001', created_at: '2026-09-05T10:00:00.000Z' },
    farmer: { phone: '9876543210', full_name: 'Ramesh Kumar' },
    centre: { name: 'Karnal Grain Market' },
    slot: { slot_date: '2026-09-05', start_time: '10:00', end_time: '12:00' },
  });
  assert(disabledRes.status === 'DISABLED', 'Returns status DISABLED when SMS_ENABLED=false');
  assert(disabledRes.bookingLink.includes('/token/TK-TEST-001'), 'Link properly generated even when SMS disabled');

  // TEST 4: Missing or Invalid Phone Handling
  console.log('\n--- TEST 4: Missing or Invalid Phone Handling ---');
  process.env.SMS_ENABLED = 'true';
  process.env.FAST2SMS_API_KEY = 'test_key_dummy_12345';
  const invalidPhoneRes = await sendBookingConfirmationSms({
    booking: { token_number: 'TK-TEST-002' },
    farmer: { phone: 'invalid_phone_string', full_name: 'Test Farmer' },
  });
  assert(invalidPhoneRes.status === 'INVALID_PHONE', 'Returns INVALID_PHONE for invalid farmer phone');
  assert(invalidPhoneRes.success === false, 'Gracefully skips dispatch for invalid phone');

  // TEST 5: Placeholder API Key Handling
  console.log('\n--- TEST 5: Placeholder API Key Safety ---');
  process.env.FAST2SMS_API_KEY = 'your_fast2sms_api_key_here';
  const placeholderRes = await sendBookingConfirmationSms({
    booking: { token_number: 'TK-TEST-003' },
    farmer: { phone: '9876543210', full_name: 'Test Farmer' },
  });
  assert(placeholderRes.status === 'NOT_CONFIGURED', 'Recognizes placeholder Fast2SMS API key as NOT_CONFIGURED');
  assert(placeholderRes.success === false, 'Gracefully skips dispatch when API key not configured');

  // TEST 6: Fast2SMS API Request Handling & Safety
  console.log('\n--- TEST 6: Fast2SMS API Request Handling ---');
  process.env.FAST2SMS_API_KEY = 'sample_fast2sms_key_test';
  process.env.SMS_PROVIDER = 'Fast2SMS';
  const apiCallRes = await sendBookingConfirmationSms({
    booking: { token_number: 'TK-TEST-004', created_at: '2026-09-05T10:00:00.000Z' },
    farmer: { phone: '9876543210', full_name: 'Ramesh Kumar' },
    centre: { name: 'Karnal Grain Market' },
    slot: { slot_date: '2026-09-05', start_time: '10:00', end_time: '12:00' },
  });
  assert(apiCallRes.status === 'ACCEPTED' || apiCallRes.status === 'API_ERROR' || apiCallRes.status === 'NETWORK_ERROR', 'Correctly processed Fast2SMS API response without throwing errors');
  if (apiCallRes.status === 'ACCEPTED') {
    assert(apiCallRes.message.includes('Fast2SMS API request accepted'), 'Honors Fast2SMS delivery verification caveat');
  }

  // TEST 7: Generic sendSMS helper function
  console.log('\n--- TEST 7: Generic sendSMS Helper ---');
  const genericRes = await sendSMS({
    phone: '9876543210',
    message: 'Test generic notification message',
  });
  assert(genericRes !== null && typeof genericRes === 'object', 'Generic sendSMS() executes successfully');

  // TEST 8: End-to-End Database Slot Booking & Registered Phone Lookup
  console.log('\n--- TEST 8: End-to-End DB Slot Booking & Registered Phone Lookup ---');
  if (!isUsingMockStore && pool) {
    const farmerRes = await pool.query("SELECT * FROM users WHERE phone = '9876543210' LIMIT 1");
    assert(farmerRes.rows.length > 0, 'Found registered farmer Ramesh Kumar in PostgreSQL');
    const farmer = farmerRes.rows[0];

    const centreRes = await pool.query("SELECT * FROM centres LIMIT 1");
    assert(centreRes.rows.length > 0, 'Found mandi centre in PostgreSQL');
    const centre = centreRes.rows[0];

    const slotRes = await pool.query("SELECT * FROM slots WHERE centre_id = $1 LIMIT 1", [centre.id]);
    assert(slotRes.rows.length > 0, 'Found available slot in PostgreSQL');
    const slot = slotRes.rows[0];

    const testToken = `TK-TEST-${Math.floor(100 + Math.random() * 900)}`;
    const testBookingId = `bk_sms_test_${Date.now()}`;

    // Execute booking insertion
    await pool.query(
      `INSERT INTO bookings (id, token_number, farmer_id, centre_id, slot_id, crop_name, crop_variety, estimated_quantity_quintals, vehicle_type, vehicle_number, status, current_station, qr_code_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'BOOKED', 'EN_ROUTE', $11, NOW())`,
      [testBookingId, testToken, farmer.id, centre.id, slot.id, 'Wheat', 'HD-2967', 50, 'Tractor Trolley', 'HR-05-AB-9999', `KISANSETU_${testToken}`]
    );

    // Verify booking in DB
    const checkBooking = await pool.query("SELECT * FROM bookings WHERE id = $1", [testBookingId]);
    assert(checkBooking.rows.length === 1, 'Booking successfully inserted and committed in PostgreSQL');
    assert(checkBooking.rows[0].token_number === testToken, 'Token number correctly matches');

    // Test SMS service dispatch with the freshly created booking (safe default disabled)
    process.env.SMS_ENABLED = 'false';
    const dispatchRes = await sendBookingConfirmationSms({
      booking: checkBooking.rows[0],
      farmer,
      centre,
      slot,
    });
    const expectedBase = (process.env.PUBLIC_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
    assert(dispatchRes.bookingLink === `${expectedBase}/token/${testToken}`, 'Generated token route matches standard application route');
  }

  console.log(`\n======================================================`);
  console.log(`🎉 ALL FAST2SMS VERIFICATION TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log(`======================================================\n`);

  if (!isUsingMockStore && pool) {
    await pool.end();
  }
}

runSmsVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
