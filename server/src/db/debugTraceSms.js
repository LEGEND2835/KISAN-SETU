import dotenv from 'dotenv';
dotenv.config();

import { initDatabase, pool, isUsingMockStore } from './index.js';
import { 
  normalizeIndianPhoneNumber, 
  maskPhoneNumber, 
  formatBookingSmsText, 
  sendBookingConfirmationSms 
} from '../services/smsService.js';

async function runTrace() {
  console.log('====================================================');
  console.log('🔍 KISANSETU MSG91 SMS TRACE & DIAGNOSTICS');
  console.log('====================================================\n');

  await initDatabase();

  // 1. Check Database User Record
  console.log('--- STEP 1: Querying Farmer Account in Database ---');
  const targetPhone = '9064097315';
  let farmer = null;
  if (!isUsingMockStore && pool) {
    const userRes = await pool.query('SELECT id, full_name, phone, role, created_at FROM users WHERE phone = $1', [targetPhone]);
    if (userRes.rows.length > 0) {
      farmer = userRes.rows[0];
      console.log('✅ Farmer Found in Database:', {
        id: farmer.id,
        full_name: farmer.full_name,
        phone: farmer.phone,
        role: farmer.role,
        created_at: farmer.created_at,
      });
    } else {
      console.log(`⚠️ No user found with phone "${targetPhone}". Checking all recent users...`);
      const allUsers = await pool.query('SELECT id, full_name, phone, role FROM users ORDER BY created_at DESC LIMIT 5');
      console.log('Recent Users in DB:', allUsers.rows);
    }
  }

  // 2. Check Bookings for Farmer
  console.log('\n--- STEP 2: Checking Bookings in Database ---');
  let recentBooking = null;
  let centre = null;
  let slot = null;

  if (farmer && pool) {
    const bRes = await pool.query('SELECT * FROM bookings WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 1', [farmer.id]);
    if (bRes.rows.length > 0) {
      recentBooking = bRes.rows[0];
      console.log('✅ Booking Found for Farmer:', {
        id: recentBooking.id,
        token_number: recentBooking.token_number,
        status: recentBooking.status,
        crop_name: recentBooking.crop_name,
        estimated_quantity: recentBooking.estimated_quantity_quintals,
        vehicle_number: recentBooking.vehicle_number,
        created_at: recentBooking.created_at,
      });

      const cRes = await pool.query('SELECT * FROM centres WHERE id = $1', [recentBooking.centre_id]);
      if (cRes.rows.length > 0) centre = cRes.rows[0];

      const sRes = await pool.query('SELECT * FROM slots WHERE id = $1', [recentBooking.slot_id]);
      if (sRes.rows.length > 0) slot = sRes.rows[0];
    } else {
      console.log('⚠️ No bookings found for this specific farmer. Checking recent bookings in DB...');
    }
  }

  if (!recentBooking && pool) {
    const anyBRes = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 1');
    if (anyBRes.rows.length > 0) {
      recentBooking = anyBRes.rows[0];
      console.log('ℹ️ Using most recent booking in DB for diagnostic trace:', recentBooking.token_number);
      const cRes = await pool.query('SELECT * FROM centres WHERE id = $1', [recentBooking.centre_id]);
      if (cRes.rows.length > 0) centre = cRes.rows[0];
      const sRes = await pool.query('SELECT * FROM slots WHERE id = $1', [recentBooking.slot_id]);
      if (sRes.rows.length > 0) slot = sRes.rows[0];
    }
  }

  // 3. Inspect Current Environment Variables
  console.log('\n--- STEP 3: Environment Variable Audit ---');
  const envSmsEnabled = process.env.SMS_ENABLED;
  const envAuthKey = process.env.MSG91_AUTH_KEY;
  const envTemplateId = process.env.MSG91_TEMPLATE_ID;
  const envSenderId = process.env.MSG91_SENDER_ID;
  const envPublicUrl = process.env.PUBLIC_APP_URL;

  console.log('SMS_ENABLED:', envSmsEnabled, `(Evaluates to: ${envSmsEnabled === 'true' || envSmsEnabled === '1'})`);
  console.log('MSG91_AUTH_KEY Configured?:', !!envAuthKey && envAuthKey !== 'your_msg91_auth_key_here' ? 'YES (Valid non-placeholder string set)' : 'NO (Using placeholder or unset)');
  console.log('MSG91_TEMPLATE_ID:', envTemplateId || '(none)');
  console.log('MSG91_SENDER_ID:', envSenderId || '(none)');
  console.log('PUBLIC_APP_URL:', envPublicUrl || '(none)');

  // 4. Trace Phone Number Normalization
  console.log('\n--- STEP 4: Phone Number Normalization ---');
  const testPhone = farmer?.phone || targetPhone;
  const normalized = normalizeIndianPhoneNumber(testPhone);
  const masked = maskPhoneNumber(testPhone);
  console.log('Raw Phone from DB:', testPhone);
  console.log('Masked Phone for Logs:', masked);
  console.log('Normalized Phone for MSG91 (Expected: 91' + targetPhone + '):', normalized);

  // 5. Generated Link and SMS Content
  console.log('\n--- STEP 5: Generated Message & Link ---');
  const token = recentBooking?.token_number || 'TK-KRL-174';
  const bookingLink = `${(envPublicUrl || 'http://localhost:5173').replace(/\/$/, '')}/token/${token}`;
  const smsText = formatBookingSmsText({
    tokenNumber: token,
    mandiName: centre?.name || 'Karnal Mandi Hub',
    slotDate: slot?.slot_date || '2026-09-05',
    slotTime: slot?.start_time ? `${slot.start_time} - ${slot.end_time}` : '10:00 - 12:00',
    bookingLink,
  });
  console.log('Generated Booking Link:', bookingLink);
  console.log('Formatted SMS Text:\n' + smsText);

  // 6. Trace SMS Service Dispatch under CURRENT Environment (SMS_ENABLED=false)
  console.log('\n--- STEP 6: Testing Dispatch with Current Environment Configuration ---');
  const currentResult = await sendBookingConfirmationSms({
    booking: recentBooking || { token_number: token },
    farmer: farmer || { phone: targetPhone, full_name: 'Farmer' },
    centre,
    slot,
  });
  console.log('Current Dispatch Result:', currentResult);

  // 7. Trace Direct MSG91 Flow API Call & Inspect Network / Response
  console.log('\n--- STEP 7: Inspecting MSG91 Flow API Payload & Server Response ---');
  const authKeyToTest = envAuthKey && envAuthKey !== 'your_msg91_auth_key_here' ? envAuthKey : 'dummy_test_key_non_secret';

  const flowPayload = {
    template_id: envTemplateId && envTemplateId !== 'your_msg91_template_id_here' ? envTemplateId : 'sample_template_id',
    sender: envSenderId || 'KSNSET',
    short_url: '0',
    recipients: [
      {
        mobiles: normalized,
        token: token,
        mandi: centre?.name || 'Karnal Mandi',
        slot: '2026-09-05 10:00 - 12:00',
        date: '2026-09-05',
        time: '10:00 - 12:00',
        link: bookingLink,
        name: farmer?.full_name || 'Farmer',
        VAR1: token,
        VAR2: centre?.name || 'Karnal Mandi',
        VAR3: '2026-09-05 10:00 - 12:00',
        VAR4: bookingLink,
      },
    ],
  };

  console.log('Generated MSG91 Flow Payload (Auth Key Excluded):', JSON.stringify(flowPayload, null, 2));

  try {
    const rawRes = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'authkey': authKeyToTest,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(flowPayload),
    });

    const resText = await rawRes.text();
    console.log('MSG91 HTTP Response Status:', rawRes.status);
    console.log('MSG91 Response Body:', resText);
  } catch (netErr) {
    console.error('MSG91 Network Error:', netErr.message);
  }

  console.log('\n====================================================');
  console.log('🏁 DIAGNOSTICS COMPLETE');
  console.log('====================================================\n');

  if (!isUsingMockStore && pool) {
    await pool.end();
  }
}

runTrace().catch(e => console.error('Trace Error:', e));
