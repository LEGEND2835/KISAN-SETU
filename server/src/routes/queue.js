import express from 'express';
import { inMemoryStore, isUsingMockStore, pool } from '../db/index.js';
import { broadcastQueueUpdate, broadcastTokenCall } from '../sockets/queueSocket.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to format booking objects
function formatBooking(b) {
  return {
    ...b,
    farmer_name: b.farmer_name || 'Registered Farmer',
    farmer_phone: b.farmer_phone || '',
    slot_time: b.start_time ? `${b.start_time} - ${b.end_time}` : '',
    quality_check: b.quality_check || null,
    weighbridge_log: b.weighbridge_log || null,
    payment_info: b.payment_info || null,
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
        return {
          ...b,
          farmer_name: farmer ? farmer.full_name : 'Registered Farmer',
          farmer_phone: farmer ? farmer.phone : '',
          slot_time: slot ? `${slot.start_time} - ${slot.end_time}` : '',
          quality_check: quality || null,
          weighbridge_log: weighbridge || null,
          payment_info: payment || null,
        };
      });
    }

    const waitingAtGate = enriched.filter(b => b.status === 'CHECKED_IN');
    const calledToGate = enriched.filter(b => b.status === 'CALLED');
    const qualityInspection = enriched.filter(b => b.status === 'QUALITY_INSPECTION');
    const weighing = enriched.filter(b => b.status === 'WEIGHING');
    const unloading = enriched.filter(b => b.status === 'UNLOADING');
    const completed = enriched.filter(b => b.status === 'PROCURED');
    const bookedUpcoming = enriched.filter(b => b.status === 'BOOKED');

    return res.json({
      success: true,
      centre: centre || null,
      summary: {
        total_today: enriched.length,
        in_progress_count: waitingAtGate.length + calledToGate.length + qualityInspection.length + weighing.length + unloading.length,
        completed_count: completed.length,
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
        completed: completed.slice(-10).reverse(),
      },
    });
  } catch (error) {
    console.error('Fetch Live Queue Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch live queue data.' });
  }
});

// POST /api/queue/:centreId/check-in - Gate Security checks in a vehicle
router.post('/:centreId/check-in', async (req, res) => {
  try {
    const { centreId } = req.params;
    const { token_number, qr_hash } = req.body;

    if (!token_number && !qr_hash) {
      return res.status(400).json({ success: false, message: 'Token number or QR code is required.' });
    }

    let booking = null;

    if (!isUsingMockStore && pool) {
      const bRes = await pool.query(
        `SELECT * FROM bookings 
         WHERE (token_number = $1 OR qr_code_hash LIKE $2) AND centre_id = $3`,
        [token_number || '', `%${qr_hash || ''}%`, centreId]
      );
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
        b => (b.token_number === token_number || (qr_hash && b.qr_code_hash.includes(qr_hash))) &&
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

    return res.json({
      success: true,
      message: `Token #${booking.token_number} successfully checked in at Gate!`,
      booking,
    });
  } catch (error) {
    console.error('Check-in Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to check in token.' });
  }
});

// POST /api/queue/:centreId/call-next - Officer calls a token to a specific desk or bay
router.post('/:centreId/call-next', async (req, res) => {
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

      const calledStation = station_name || `DESK_${desk_number || '1'}`;
      const calledTime = new Date().toISOString();

      await pool.query(
        `UPDATE bookings 
         SET status = 'CALLED', current_station = $1, called_time = $2 
         WHERE id = $3`,
        [calledStation, calledTime, booking.id]
      );

      await pool.query(
        `INSERT INTO queue_audit_logs (id, booking_id, from_status, to_status, station, timestamp)
         VALUES ($1, $2, $3, 'CALLED', $4, $5)`,
        [`log_${Date.now()}`, booking.id, booking.status, calledStation, calledTime]
      );

      booking.status = 'CALLED';
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

      booking.status = 'CALLED';
      booking.current_station = station_name || `DESK_${desk_number || '1'}`;
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

    return res.json({
      success: true,
      message: `Token ${booking.token_number} called to ${booking.current_station}!`,
      booking,
    });
  } catch (error) {
    console.error('Call Next Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to call token.' });
  }
});

// POST /api/queue/:centreId/update-status - Transition status
router.post('/:centreId/update-status', async (req, res) => {
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
