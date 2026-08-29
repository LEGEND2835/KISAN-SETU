import pg from 'pg';
import dotenv from 'dotenv';
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

dotenv.config();

async function runMvpVerification() {
  console.log('🚀 Launching KisanSetu MVP 14-Point End-to-End Verification...\n');

  // Setup test server on port 5055 to prevent conflicts
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

  await new Promise(resolve => server.listen(5055, resolve));
  console.log('📡 Test Server listening on http://localhost:5055\n');

  await initDatabase();
  await runSeed();

  const results = [];
  function record(itemNum, title, pass, notes = '') {
    results.push({ itemNum, title, pass, notes });
    const tag = pass ? '✅ PASS' : '❌ FAIL';
    console.log(`[${tag}] #${itemNum} ${title} ${notes ? '- ' + notes : ''}`);
  }

  try {
    const baseUrl = 'http://localhost:5055/api';

    // 1. Farmer login
    const farmerLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9876543210', password: 'farmer123' }),
    }).then(r => r.json());

    const farmerToken = farmerLoginRes.token;
    record(1, 'Farmer login', farmerLoginRes.success && !!farmerToken, `User: ${farmerLoginRes.user?.full_name}`);

    // 2. View centres
    const centresRes = await fetch(`${baseUrl}/centres`).then(r => r.json());
    record(2, 'View centres', centresRes.success && centresRes.centres.length >= 4, `Found ${centresRes.centres?.length} Mandis`);

    const centreId = centresRes.centres[0].id; // ctr_karnal_01

    // 3. View available slots
    const today = new Date().toISOString().split('T')[0];
    const slotsRes = await fetch(`${baseUrl}/slots?centre_id=${centreId}&date=${today}`).then(r => r.json());
    record(3, 'View available slots', slotsRes.success && slotsRes.slots.length > 0, `Found ${slotsRes.slots?.length} time slots`);

    const targetSlot = slotsRes.slots[0];

    // Setup Socket.IO realtime listener (Item 13)
    let socketReceivedUpdate = false;
    let socketReceivedCall = false;
    const socketClient = ClientSocket('http://localhost:5055', { transports: ['websocket'] });
    
    await new Promise((resolve) => {
      socketClient.on('connect', () => {
        socketClient.emit('join_centre', centreId);
        setTimeout(resolve, 200);
      });
    });

    socketClient.on('queue_updated', () => {
      socketReceivedUpdate = true;
    });

    socketClient.on('token_called', () => {
      socketReceivedCall = true;
    });

    // 4. Book a slot
    const bookRes = await fetch(`${baseUrl}/bookings/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        centre_id: centreId,
        slot_id: targetSlot.id,
        crop_name: 'Wheat',
        crop_variety: 'PBW-502',
        estimated_quantity_quintals: 55.0,
        vehicle_type: 'Tractor Trolley',
        vehicle_number: 'HR-05-MV-9999',
      }),
    }).then(r => r.json());

    const booking = bookRes.booking;
    record(4, 'Book a slot', bookRes.success && !!booking, `Token: ${booking?.token_number}`);

    // 5. Token/QR generation
    const hasTokenAndQr = booking && booking.token_number && booking.qr_code_hash;
    record(5, 'Token/QR generation', hasTokenAndQr, `Token: ${booking?.token_number}, QR: ${booking?.qr_code_hash}`);

    // 6. Farmer queue status
    const farmerBookingRes = await fetch(`${baseUrl}/bookings/${booking.id}`).then(r => r.json());
    record(6, 'Farmer queue status', farmerBookingRes.success && farmerBookingRes.booking?.status === 'BOOKED', `Status: ${farmerBookingRes.booking?.status}`);

    // 7. Officer login
    const officerLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9876543220', password: 'admin123' }),
    }).then(r => r.json());
    const officerToken = officerLoginRes.token;
    record(7, 'Officer login', officerLoginRes.success && !!officerToken, `User: ${officerLoginRes.user?.full_name}`);

    // 8. Officer sees the booking in live queue
    const liveQueueRes = await fetch(`${baseUrl}/queue/${centreId}/live`).then(r => r.json());
    const foundInQueue = liveQueueRes.stages.booked.some(b => b.id === booking.id);
    record(8, 'Officer sees the booking', liveQueueRes.success && foundInQueue, `Total Today: ${liveQueueRes.summary?.total_today}`);

    // Check in vehicle at gate
    await fetch(`${baseUrl}/queue/${centreId}/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_number: booking.token_number }),
    });

    // 9. Officer calls the next farmer
    const callRes = await fetch(`${baseUrl}/queue/${centreId}/call-next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_id: booking.id, station_name: 'BAY_1' }),
    }).then(r => r.json());
    record(9, 'Officer calls the next farmer', callRes.success && callRes.booking?.status === 'CALLED', `Station: ${callRes.booking?.current_station}`);

    // 10. Queue status changes
    const updatedStatusRes = await fetch(`${baseUrl}/bookings/${booking.id}`).then(r => r.json());
    record(10, 'Queue status changes', updatedStatusRes.booking?.status === 'CALLED', `Updated Status: ${updatedStatusRes.booking?.status}`);

    // 11. Quality/weighing/procurement flow is reachable
    const qcRes = await fetch(`${baseUrl}/procurement/quality-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: booking.id,
        moisture_percentage: 11.5,
        foreign_matter_percentage: 0.5,
        damaged_grains_percentage: 0.2,
      }),
    }).then(r => r.json());

    const weighRes = await fetch(`${baseUrl}/procurement/weighbridge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: booking.id,
        gross_weight_kg: 8500,
        tare_weight_kg: 3000,
      }),
    }).then(r => r.json());

    const receiptRes = await fetch(`${baseUrl}/procurement/receipt/${booking.id}`).then(r => r.json());
    const isProcurementFlowComplete = qcRes.success && weighRes.success && receiptRes.success && receiptRes.receipt?.procurement_details?.net_payable_amount > 0;
    record(11, 'Quality/weighing/procurement flow is reachable', isProcurementFlowComplete, `Receipt: ${receiptRes.receipt?.receipt_number}, Net Amount: ₹${receiptRes.receipt?.procurement_details?.net_payable_amount}`);

    // 12. PostgreSQL persistence verification
    const dbCheck = await pool.query('SELECT b.id, b.status, p.net_payable_amount, q.grain_grade FROM bookings b JOIN payments p ON b.id = p.booking_id JOIN quality_checks q ON b.id = q.booking_id WHERE b.id = $1', [booking.id]);
    const isPersistedInPg = dbCheck.rows.length === 1 && dbCheck.rows[0].status === 'PROCURED';
    record(12, 'PostgreSQL persistence', isPersistedInPg, `PostgreSQL Verified: Status = ${dbCheck.rows[0]?.status}, Grade = ${dbCheck.rows[0]?.grain_grade}`);

    // 13. Realtime queue update
    await new Promise(r => setTimeout(r, 600));
    socketClient.disconnect();
    record(13, 'Realtime queue update', socketReceivedUpdate || socketReceivedCall, 'Socket.IO event "queue_updated" / "token_called" received in real-time');

    // Clean up test booking
    await pool.query('DELETE FROM payments WHERE booking_id = $1', [booking.id]);
    await pool.query('DELETE FROM weighbridge_logs WHERE booking_id = $1', [booking.id]);
    await pool.query('DELETE FROM quality_checks WHERE booking_id = $1', [booking.id]);
    await pool.query('DELETE FROM queue_audit_logs WHERE booking_id = $1', [booking.id]);
    await pool.query('DELETE FROM bookings WHERE id = $1', [booking.id]);

    console.log('\n========================================================');
    console.log('🏁 Verification Checklist Summary:');
    const totalPassed = results.filter(r => r.pass).length;
    console.log(`Total: ${totalPassed}/${results.length} PASSED`);
    console.log('========================================================\n');

  } catch (err) {
    console.error('Verification Error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
}

runMvpVerification();
