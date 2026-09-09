import express from 'express';
import { inMemoryStore, isUsingMockStore, pool } from '../db/index.js';
import { broadcastQueueUpdate, broadcastTokenCall } from '../sockets/queueSocket.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { sendGateAdmissionSms, sendGateCallSms } from '../services/notifications.js';

const router = express.Router();

// Helper to format booking objects for public live queue (privacy-safe)
function formatBooking(b) {
  const phone = b.farmer_phone || '';
  const maskedPhone = phone.length >= 4 ? `${phone.slice(0, 2)}******${phone.slice(-2)}` : '';
  const { qr_code_hash, ...rest } = b;

  let sanitizedPayment = null;
  if (b.payment_info) {
    const { bank_account_last4, ifsc_code, transaction_ref, ...payRest } = b.payment_info;
    sanitizedPayment = payRest;
  }

  return {
    ...rest,
    farmer_name: b.farmer_name || 'Registered Farmer',
    farmer_phone: maskedPhone,
    slot_time: b.start_time ? `${b.start_time} - ${b.end_time}` : (b.slot_time || ''),
    rejection_stage: b.rejection_stage || null,
    rejection_reason: b.rejection_reason || null,
    quality_check: b.quality_check || null,
    weighbridge_log: b.weighbridge_log || null,
    payment_info: sanitizedPayment,
  };
}

// GET /api/queue/:centreId/live - Get live queue snapshot categorized by stage
router.get('/:centreId/live', async (req, res) => {
  try {
    const { centreId } = req.params;
    let centre = null;
    let enriched = [];

    if (!isUsingMockStore && pool) {
      const cRes = await pool.query('SELECT * FROM centres WHERE id = $1', [centreId]);
      if (cRes.rows.length > 0) centre = cRes.rows[0];

      const bRes = await pool.query(
        `SELECT 
           b.*,
           u.full_name as farmer_name,
           u.phone as farmer_phone,
           s.start_time,
           s.end_time,
           row_to_json(q.*) as quality_check,
           row_to_json(w.*) as weighbridge_log,
           row_to_json(p.*) as payment_info
         FROM bookings b
         LEFT JOIN users u ON b.farmer_id = u.id
         LEFT JOIN slots s ON b.slot_id = s.id
         LEFT JOIN quality_checks q ON b.id = q.booking_id
         LEFT JOIN weighbridge_logs w ON b.id = w.booking_id
         LEFT JOIN payments p ON b.id = p.booking_id
         WHERE b.centre_id = $1
         ORDER BY b.created_at ASC`,
        [centreId]
      );
      enriched = bRes.rows.map(formatBooking);
    } else {
      centre = inMemoryStore.centres.find(c => c.id === centreId);
      const bookings = inMemoryStore.bookings.filter(b => b.centre_id === centreId);
      enriched = bookings.map(b => {
        const farmer = inMemoryStore.users.find(u => u.id === b.farmer_id);
        const quality = inMemoryStore.quality_checks.find(q => q.booking_id === b.id);
        const weighbridge = inMemoryStore.weighbridge_logs.find(w => w.booking_id === b.id);
        const payment = inMemoryStore.payments.find(p => p.booking_id === b.id);
        const slot = inMemoryStore.slots.find(s => s.id === b.slot_id);
        return formatBooking({
          ...b,
          farmer_name: farmer ? farmer.full_name : 'Registered Farmer',
          farmer_phone: farmer ? farmer.phone : '',
          slot_time: slot ? `${slot.start_time} - ${slot.end_time}` : '',
          rejection_stage: b.rejection_stage || null,
          rejection_reason: b.rejection_reason || null,
          quality_check: quality || null,
          weighbridge_log: weighbridge || null,
          payment_info: payment || null,
        });
      });
    }

    const waitingAtGate = enriched.filter(b => b.status === 'CHECKED_IN');
    const calledToGate = enriched.filter(b => b.status === 'CALLED');
    const qualityInspection = enriched.filter(b => b.status === 'QUALITY_INSPECTION');
    const weighing = enriched.filter(b => b.status === 'WEIGHING');
    const unloading = enriched.filter(b => b.status === 'UNLOADING');
    const completed = enriched.filter(b => b.status === 'PROCURED');
    const rejected = enriched.filter(b => b.status === 'REJECTED');
    const bookedUpcoming = enriched.filter(b => b.status === 'BOOKED');

    return res.json({
      success: true,
      centre: centre || null,
      summary: {
        total_today: enriched.length,
        in_progress_count: waitingAtGate.length + calledToGate.length + qualityInspection.length + weighing.length + unloading.length,
        completed_count: completed.length,
        rejected_count: rejected.length,
        upcoming_count: bookedUpcoming.length,
        estimated_avg_wait_mins: waitingAtGate.length * 12 + 10,
      },
      stages: {
        booked: bookedUpcoming,
        waiting_at_gate: waitingAtGate,
        called: calledToGate,
        quality_inspection: qualityInspection,
        weighing: weighing,
        unloading: unloading,
        completed: completed.slice(-15).reverse(),
        rejected: rejected.slice(-15).reverse(),
      },
    });
  } catch (error) {
    console.error('Fetch Live Queue Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch live queue data.' });
  }
});

// POST /api/queue/:centreId/check-in - Gate Security checks in a vehicle
router.post(
  '/:centreId/check-in',
  authenticateToken,
  authorizeRoles('centre_officer', 'quality_inspector', 'weighbridge_operator', 'admin'),
  async (req, res) => {
    try {
      const { centreId } = req.params;
      const { token_number, qr_hash } = req.body;

      if (!token_number && !qr_hash) {
        return res.status(400).json({ success: false, message: 'Token number or QR code is required.' });
      }

      let booking = null;

      if (!isUsingMockStore && pool) {
        let bRes;
        if (token_number && qr_hash) {
          bRes = await pool.query(
            `SELECT * FROM bookings WHERE (token_number = $1 OR id = $1 OR qr_code_hash LIKE $2) AND centre_id = $3`,
            [token_number, `%${qr_hash}%`, centreId]
          );
        } else if (token_number) {
          bRes = await pool.query(
            `SELECT * FROM bookings WHERE (token_number = $1 OR id = $1) AND centre_id = $2`,
            [token_number, centreId]
          );
        } else {
          bRes = await pool.query(
            `SELECT * FROM bookings WHERE qr_code_hash LIKE $1 AND centre_id = $2`,
            [`%${qr_hash}%`, centreId]
          );
        }

        if (bRes.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'No matching booking found for this centre.' });
        }
        booking = bRes.rows[0];

        if (booking.status !== 'BOOKED') {
          return res.status(400).json({
            success: false,
            message: `Token is already checked in (Current Status: ${booking.status}).`,
            current_status: booking.status,
          });
        }

        const checkInTime = new Date().toISOString();
        await pool.query(
          `UPDATE bookings 
           SET status = 'CHECKED_IN', current_station = 'WAITING_AREA', check_in_time = $1 
           WHERE id = $2`,
          [checkInTime, booking.id]
        );

        await pool.query(
          `INSERT INTO queue_audit_logs (id, booking_id, from_status, to_status, station, timestamp)
           VALUES ($1, $2, 'BOOKED', 'CHECKED_IN', 'MANDI_ENTRY_GATE', $3)`,
          [`log_${Date.now()}`, booking.id, checkInTime]
        );
        booking.status = 'CHECKED_IN';
        booking.current_station = 'WAITING_AREA';
      } else {
        booking = inMemoryStore.bookings.find(
          b => ((token_number && (b.token_number === token_number || b.id === token_number)) || 
                (qr_hash && b.qr_code_hash.includes(qr_hash))) &&
               b.centre_id === centreId
        );
        if (!booking) {
          return res.status(404).json({ success: false, message: 'No matching booking found for this centre.' });
        }
        if (booking.status !== 'BOOKED') {
          return res.status(400).json({
            success: false,
            message: `Token is already checked in (Current Status: ${booking.status}).`,
            current_status: booking.status,
          });
        }
        booking.status = 'CHECKED_IN';
        booking.current_station = 'WAITING_AREA';
        booking.check_in_time = new Date().toISOString();
      }

      // Broadcast realtime event to room
      broadcastQueueUpdate(centreId);

      // Fetch registered farmer profile and mandi centre details for SMS notification
      let farmerUser = null;
      let centreObj = null;

      if (!isUsingMockStore && pool) {
        try {
          const fRes = await pool.query('SELECT id, full_name, phone FROM users WHERE id = $1', [booking.farmer_id]);
          if (fRes.rows.length > 0) farmerUser = fRes.rows[0];
          const cRes = await pool.query('SELECT id, name, code, address FROM centres WHERE id = $1', [centreId]);
          if (cRes.rows.length > 0) centreObj = cRes.rows[0];
        } catch (uErr) {
          console.warn('[SMS] Could not query farmer/centre details for gate check-in SMS:', uErr.message);
        }
      } else {
        farmerUser = inMemoryStore.users.find(u => u.id === booking.farmer_id);
        centreObj = inMemoryStore.centres.find(c => c.id === centreId);
      }

      // Dispatch Gate Admission SMS asynchronously (guaranteed non-blocking)
      sendGateAdmissionSms({
        booking,
        farmer: farmerUser,
        centre: centreObj,
      }).catch(smsErr => {
        console.error('[SMS-SERVICE] Unhandled error during Gate Admission SMS dispatch:', smsErr.message);
      });

      return res.json({
        success: true,
        message: `Token #${booking.token_number} successfully checked in at Gate!`,
        booking,
      });
    } catch (error) {
      console.error('Check-in Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to check in token.' });
    }
  }
);

// POST /api/queue/:centreId/call-next - Officer calls a token to a specific desk or bay
router.post(
  '/:centreId/call-next',
  authenticateToken,
  authorizeRoles('centre_officer', 'quality_inspector', 'weighbridge_operator', 'admin'),
  async (req, res) => {
    try {
      const { centreId } = req.params;
      const { token_id, station_name, desk_number } = req.body;
      let booking = null;

      if (!isUsingMockStore && pool) {
        if (token_id) {
          const bRes = await pool.query(
            `SELECT b.*, u.full_name as farmer_name 
             FROM bookings b 
             LEFT JOIN users u ON b.farmer_id = u.id 
             WHERE (b.id = $1 OR b.token_number = $1) AND b.centre_id = $2`,
            [token_id, centreId]
          );
          if (bRes.rows.length > 0) booking = bRes.rows[0];
        } else {
          const nextRes = await pool.query(
            `SELECT b.*, u.full_name as farmer_name 
             FROM bookings b 
             LEFT JOIN users u ON b.farmer_id = u.id 
             WHERE b.centre_id = $1 AND b.status = 'CHECKED_IN' 
             ORDER BY b.check_in_time ASC LIMIT 1`,
            [centreId]
          );
          if (nextRes.rows.length > 0) booking = nextRes.rows[0];
        }

        if (!booking) {
          return res.status(404).json({ success: false, message: 'No vehicle available in waiting queue to call.' });
        }

        const targetStatus = req.body.target_status || 
          (station_name?.toLowerCase().includes('quality') || station_name?.toLowerCase().includes('lab') 
            ? 'QUALITY_INSPECTION' 
            : 'CALLED');
        const calledStation = station_name || (targetStatus === 'QUALITY_INSPECTION' ? 'QUALITY_LAB' : `DESK_${desk_number || '1'}`);
        const calledTime = new Date().toISOString();

        await pool.query(
          `UPDATE bookings 
           SET status = $1, current_station = $2, called_time = $3 
           WHERE id = $4`,
          [targetStatus, calledStation, calledTime, booking.id]
        );

        await pool.query(
          `INSERT INTO queue_audit_logs (id, booking_id, from_status, to_status, station, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [`log_${Date.now()}`, booking.id, booking.status, targetStatus, calledStation, calledTime]
        );

        booking.status = targetStatus;
        booking.current_station = calledStation;
      } else {
        if (token_id) {
          booking = inMemoryStore.bookings.find(b => b.id === token_id || b.token_number === token_id);
        } else {
          booking = inMemoryStore.bookings.find(b => b.centre_id === centreId && b.status === 'CHECKED_IN');
        }

        if (!booking) {
          return res.status(404).json({ success: false, message: 'No vehicle available in waiting queue to call.' });
        }

        const targetStatus = req.body.target_status || 
          (station_name?.toLowerCase().includes('quality') || station_name?.toLowerCase().includes('lab') 
            ? 'QUALITY_INSPECTION' 
            : 'CALLED');
        const calledStation = station_name || (targetStatus === 'QUALITY_INSPECTION' ? 'QUALITY_LAB' : `DESK_${desk_number || '1'}`);

        booking.status = targetStatus;
        booking.current_station = calledStation;
        booking.called_time = new Date().toISOString();
      }

      // Broadcast announcement to Mandi TV Screens & Farmer App
      broadcastTokenCall(centreId, {
        tokenId: booking.id,
        tokenNumber: booking.token_number,
        stationName: booking.current_station,
        farmerName: booking.farmer_name || 'Farmer',
        vehicleNumber: booking.vehicle_number,
        cropName: booking.crop_name,
      });

      broadcastQueueUpdate(centreId);

      // Fetch registered farmer profile for station call SMS notification
      let farmerUser = null;
      if (!isUsingMockStore && pool) {
        try {
          const fRes = await pool.query('SELECT id, full_name, phone FROM users WHERE id = $1', [booking.farmer_id]);
          if (fRes.rows.length > 0) farmerUser = fRes.rows[0];
        } catch (uErr) {
          console.warn('[SMS] Could not query farmer details for gate call SMS:', uErr.message);
        }
      } else {
        farmerUser = inMemoryStore.users.find(u => u.id === booking.farmer_id);
      }

      // Dispatch Gate Call SMS asynchronously
      sendGateCallSms({
        booking,
        farmer: farmerUser,
        stationName: booking.current_station,
        deskNumber,
      }).catch(smsErr => {
        console.error('[SMS-SERVICE] Unhandled error during Gate Call SMS dispatch:', smsErr.message);
      });

      return res.json({
        success: true,
        message: `Token ${booking.token_number} called to ${booking.current_station}!`,
        booking,
      });
    } catch (error) {
      console.error('Call Next Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to call token.' });
    }
  }
);

// POST /api/queue/:centreId/update-status - Transition status
router.post(
  '/:centreId/update-status',
  authenticateToken,
  authorizeRoles('centre_officer', 'quality_inspector', 'weighbridge_operator', 'admin'),
  async (req, res) => {
  try {
    const { centreId } = req.params;
    const { booking_id, new_status, current_station, notes } = req.body;

    if (!booking_id || !new_status) {
      return res.status(400).json({ success: false, message: 'booking_id and new_status are required.' });
    }

    let booking = null;

    if (!isUsingMockStore && pool) {
      const bRes = await pool.query('SELECT * FROM bookings WHERE id = $1 OR token_number = $1', [booking_id]);
      if (bRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }
      booking = bRes.rows[0];

      const completionTime = new_status === 'PROCURED' ? new Date().toISOString() : null;
      const targetStation = current_station || booking.current_station;

      await pool.query(
        `UPDATE bookings 
         SET status = $1, current_station = $2, completion_time = COALESCE($3, completion_time) 
         WHERE id = $4`,
        [new_status, targetStation, completionTime, booking.id]
      );

      await pool.query(
        `INSERT INTO queue_audit_logs (id, booking_id, from_status, to_status, station, notes, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [`log_${Date.now()}`, booking.id, booking.status, new_status, targetStation, notes || '', new Date().toISOString()]
      );

      booking.status = new_status;
      booking.current_station = targetStation;
    } else {
      booking = inMemoryStore.bookings.find(b => b.id === booking_id || b.token_number === booking_id);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }
      booking.status = new_status;
      if (current_station) booking.current_station = current_station;
      if (new_status === 'PROCURED') booking.completion_time = new Date().toISOString();
    }

    broadcastQueueUpdate(centreId);

    return res.json({
      success: true,
      message: `Token ${booking.token_number} updated to ${new_status}`,
      booking,
    });
  } catch (error) {
    console.error('Update Status Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update queue state.' });
  }
});

export default router;
