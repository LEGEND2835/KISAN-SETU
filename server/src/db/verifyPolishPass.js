import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket } from '../../../client/node_modules/socket.io-client/build/esm/index.js';

import { initDatabase, pool } from './index.js';
import { runSeed } from './seed.js';
import authRoutes from '../routes/auth.js';
import centresRoutes from '../routes/centres.js';
import slotsRoutes from '../routes/slots.js';
import queueRoutes from '../routes/queue.js';
import procurementRoutes from '../routes/procurement.js';
import aiRoutes from '../routes/ai.js';
import { initQueueSocket } from '../sockets/queueSocket.js';

async function runPolishVerification() {
  console.log('🌾 Running KisanSetu Polish & Bug-Fix Verification...\n');

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/centres', centresRoutes);
  app.use('/api/slots', slotsRoutes);
  app.use('/api/bookings', slotsRoutes);
  app.use('/api/queue', queueRoutes);
  app.use('/api/procurement', procurementRoutes);
  app.use('/api/ai', aiRoutes);

  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: '*' } });
  initQueueSocket(io);

  await new Promise(resolve => server.listen(5056, resolve));
  console.log('📡 Test Server listening on http://localhost:5056\n');

  await initDatabase();
  await runSeed();

  const results = [];
  function record(title, pass, notes = '') {
    results.push({ title, pass, notes });
    const tag = pass ? '✅ PASS' : '❌ FAIL';
    console.log(`[${tag}] ${title} ${notes ? '- ' + notes : ''}`);
  }

  const baseUrl = 'http://localhost:5056/api';

  try {
    // TEST 1: Sign in only authenticates existing users
    const unregLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9998887776', password: 'unknownpassword' }),
    });
    record(
      'Sign In rejects non-existent user with 401',
      unregLoginRes.status === 401,
      `Status: ${unregLoginRes.status}`
    );

    // TEST 2: Registration with role creates user and returns DB role
    const testPhone = `91234${Math.floor(10000 + Math.random() * 90000)}`;
    const regRes = await fetch(`${baseUrl}/auth/register-farmer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Farmer Dev',
        phone: testPhone,
        password: 'pass123farmer',
        role: 'farmer',
        state: 'Punjab',
        district: 'Patiala',
        village: 'Nabha',
      }),
    }).then(r => r.json());
    record(
      'Register new farmer with role',
      regRes.success && regRes.user?.role === 'farmer' && regRes.user?.phone === testPhone,
      `Created User ID: ${regRes.user?.id}`
    );

    // TEST 3: Login for newly registered user returns role from DB
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, password: 'pass123farmer' }),
    }).then(r => r.json());
    record(
      'Login authenticates and returns user role from PostgreSQL',
      loginRes.success && loginRes.user?.role === 'farmer' && !!loginRes.token,
      `Role from DB: ${loginRes.user?.role}`
    );
    const newFarmerToken = loginRes.token;

    // Get centres and available slot (future date ensures slot is never expired regardless of time of day)
    const centresRes = await fetch(`${baseUrl}/centres`).then(r => r.json());
    const centreId = centresRes.centres[0].id;
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const slotsRes = await fetch(`${baseUrl}/slots?centre_id=${centreId}&date=${tomorrow}`).then(r => r.json());
    const targetSlot = slotsRes.slots.find(s => s.is_bookable) || slotsRes.slots[0];

    // TEST 4: Vehicle capacity check on backend (reject 60 Qtl on Bullock Cart)
    const invalidBookRes = await fetch(`${baseUrl}/bookings/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newFarmerToken}`,
      },
      body: JSON.stringify({
        centre_id: centreId,
        slot_id: targetSlot.id,
        crop_name: 'Wheat',
        crop_variety: 'HD-2967',
        estimated_quantity_quintals: 60.0,
        vehicle_type: 'Bullock Cart',
        vehicle_number: 'PB-11-BC-01',
      }),
    });
    const invalidBookJson = await invalidBookRes.json();
    record(
      'Vehicle capacity limit rejected (60 Qtl on Bullock Cart)',
      invalidBookRes.status === 400 && invalidBookJson.message.includes('exceeds maximum capacity'),
      `Message: ${invalidBookJson.message}`
    );

    // Setup realtime socket to verify broadcast on booking
    let queueUpdateFired = false;
    const socketClient = ClientSocket('http://localhost:5056', { transports: ['websocket'] });
    await new Promise(resolve => {
      socketClient.on('connect', () => {
        socketClient.emit('join_centre', centreId);
        setTimeout(resolve, 200);
      });
    });
    socketClient.on('queue_updated', () => {
      queueUpdateFired = true;
    });

    // TEST 5: Valid booking with Tractor Trolley (60 Qtl <= 100 Qtl)
    const validBookRes = await fetch(`${baseUrl}/bookings/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newFarmerToken}`,
      },
      body: JSON.stringify({
        centre_id: centreId,
        slot_id: targetSlot.id,
        crop_name: 'Wheat',
        crop_variety: 'HD-2967',
        estimated_quantity_quintals: 60.0,
        vehicle_type: 'Tractor Trolley',
        vehicle_number: 'PB-11-TT-7788',
      }),
    }).then(r => r.json());
    const newBooking = validBookRes.booking;
    record(
      'Valid booking saved to PostgreSQL with Tractor Trolley',
      validBookRes.success && !!newBooking?.token_number,
      `Token: ${newBooking?.token_number}`
    );

    await new Promise(r => setTimeout(r, 300));
    record(
      'Realtime queue_updated event broadcast on booking',
      queueUpdateFired,
      'Socket.IO broadcastQueueUpdate fired'
    );

    // TEST 6: Officer logs in and sees new booking in stages.booked
    const officerLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9876543220', password: 'admin123' }),
    }).then(r => r.json());
    const officerToken = officerLoginRes.token;

    const liveQueueRes = await fetch(`${baseUrl}/queue/${centreId}/live`).then(r => r.json());
    const foundBookingInStages = liveQueueRes.stages.booked.some(b => b.id === newBooking.id);
    record(
      'Farmer -> Centre Sync: Officer sees new booking in stages.booked',
      liveQueueRes.success && foundBookingInStages,
      `Found Token: ${newBooking.token_number} in Scheduled Bookings`
    );

    // TEST 7: Gate Check-in moves booking to waiting_at_gate
    const checkInRes = await fetch(`${baseUrl}/queue/${centreId}/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_number: newBooking.token_number }),
    }).then(r => r.json());
    record(
      'Gate Check-in execution',
      checkInRes.success && checkInRes.booking?.status === 'CHECKED_IN',
      `Status updated to: ${checkInRes.booking?.status}`
    );

    // TEST 8: Full Procurement Flow to J-Form Generation
    await fetch(`${baseUrl}/procurement/quality-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: newBooking.id,
        moisture_percentage: 11.2,
        foreign_matter_percentage: 0.4,
        damaged_grains_percentage: 0.1,
      }),
    });

    await fetch(`${baseUrl}/procurement/weighbridge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: newBooking.id,
        gross_weight_kg: 9200,
        tare_weight_kg: 3200,
      }),
    });

    const receiptRes = await fetch(`${baseUrl}/procurement/receipt/${newBooking.id}`).then(r => r.json());
    record(
      'J-Form Receipt generated with dynamic data and timestamp',
      receiptRes.success && !!receiptRes.receipt?.receipt_number && !!receiptRes.receipt?.generated_at,
      `Receipt: ${receiptRes.receipt?.receipt_number}, Net Weight: ${receiptRes.receipt?.procurement_details?.net_weight_quintals} Qtl, Net Amount: ₹${receiptRes.receipt?.procurement_details?.net_payable_amount}`
    );

    // TEST 9: Dynamic Analytics API endpoint
    const analyticsRes = await fetch(`${baseUrl}/procurement/analytics`).then(r => r.json());
    record(
      'Dynamic Mandi Analytics API from PostgreSQL',
      analyticsRes.success && analyticsRes.stats?.total_procured_quintals > 0 && analyticsRes.commodity_breakdown?.length > 0,
      `Total Procured: ${analyticsRes.stats?.total_procured_quintals} Qtl, Total Payout: ₹${analyticsRes.stats?.total_dbt_payout}, Commodities: ${analyticsRes.commodity_breakdown?.length}`
    );

    socketClient.disconnect();

    // Clean up test data
    await pool.query('DELETE FROM payments WHERE booking_id = $1', [newBooking.id]);
    await pool.query('DELETE FROM weighbridge_logs WHERE booking_id = $1', [newBooking.id]);
    await pool.query('DELETE FROM quality_checks WHERE booking_id = $1', [newBooking.id]);
    await pool.query('DELETE FROM queue_audit_logs WHERE booking_id = $1', [newBooking.id]);
    await pool.query('DELETE FROM bookings WHERE id = $1', [newBooking.id]);
    await pool.query('DELETE FROM users WHERE id = $1', [regRes.user.id]);

    console.log('\n========================================================');
    console.log('🏆 Polish Pass Verification Results:');
    const totalPassed = results.filter(r => r.pass).length;
    console.log(`Total: ${totalPassed}/${results.length} PASSED`);
    console.log('========================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
}

runPolishVerification();
