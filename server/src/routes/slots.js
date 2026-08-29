import express from 'express';
import { inMemoryStore, isUsingMockStore, pool } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { broadcastQueueUpdate } from '../sockets/queueSocket.js';

const router = express.Router();

// GET /api/slots - Fetch available slots for a centre on a given date
router.get('/', async (req, res) => {
  try {
    const { centre_id, date } = req.query;

    if (!centre_id) {
      return res.status(400).json({ success: false, message: 'centre_id is required.' });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    let slots = [];

    if (!isUsingMockStore && pool) {
      const dbRes = await pool.query(
        'SELECT * FROM slots WHERE centre_id = $1 AND slot_date = $2 ORDER BY start_time ASC',
        [centre_id, targetDate]
      );
      slots = dbRes.rows;

      // If no slots exist for future date, dynamically generate standard time windows in PostgreSQL
      if (slots.length === 0) {
        const timeSlots = [
          { start: '08:00', end: '10:00' },
          { start: '10:00', end: '12:00' },
          { start: '12:00', end: '14:00' },
          { start: '14:00', end: '16:00' },
          { start: '16:00', end: '18:00' },
        ];

        for (let idx = 0; idx < timeSlots.length; idx++) {
          const ts = timeSlots[idx];
          const slotId = `slt_${centre_id.slice(-6)}_${targetDate.replace(/-/g, '')}_${idx + 1}`;
          const insertRes = await pool.query(
            `INSERT INTO slots (id, centre_id, slot_date, start_time, end_time, max_capacity_quintals, booked_capacity_quintals, max_tokens, booked_tokens, status)
             VALUES ($1, $2, $3, $4, $5, 1500, 0, 25, 0, 'OPEN')
             ON CONFLICT (centre_id, slot_date, start_time, end_time) DO UPDATE SET status = 'OPEN'
             RETURNING *`,
            [slotId, centre_id, targetDate, ts.start, ts.end]
          );
          slots.push(insertRes.rows[0]);
        }
      }
    } else {
      slots = inMemoryStore.slots.filter(
        s => s.centre_id === centre_id && s.slot_date === targetDate
      );
      if (slots.length === 0) {
        const timeSlots = [
          { start: '08:00', end: '10:00' },
          { start: '10:00', end: '12:00' },
          { start: '12:00', end: '14:00' },
          { start: '14:00', end: '16:00' },
          { start: '16:00', end: '18:00' },
        ];
        slots = timeSlots.map((ts, idx) => {
          const newSlot = {
            id: `slt_${centre_id}_${targetDate}_${idx + 1}`,
            centre_id,
            slot_date: targetDate,
            start_time: ts.start,
            end_time: ts.end,
            max_capacity_quintals: 1500,
            booked_capacity_quintals: 0,
            max_tokens: 25,
            booked_tokens: 0,
            status: 'OPEN',
            created_at: new Date().toISOString(),
          };
          inMemoryStore.slots.push(newSlot);
          return newSlot;
        });
      }
    }

    // Add availability metrics
    const enhancedSlots = slots.map(s => {
      const bookedTokens = parseInt(s.booked_tokens || '0', 10);
      const maxTokens = parseInt(s.max_tokens || '25', 10);
      const maxCap = parseFloat(s.max_capacity_quintals || '1500');
      const bookedCap = parseFloat(s.booked_capacity_quintals || '0');

      const remainingTokens = maxTokens - bookedTokens;
      const remainingCapacity = maxCap - bookedCap;
      const occupancyPercentage = Math.round((bookedTokens / maxTokens) * 100);

      return {
        ...s,
        remaining_tokens: Math.max(0, remainingTokens),
        remaining_capacity_quintals: Math.max(0, remainingCapacity),
        occupancy_percentage: occupancyPercentage,
        congestion_color: occupancyPercentage >= 80 ? 'RED' : occupancyPercentage >= 40 ? 'YELLOW' : 'GREEN',
        is_bookable: remainingTokens > 0 && s.status === 'OPEN',
      };
    });

    return res.json({
      success: true,
      centre_id,
      date: targetDate,
      slots: enhancedSlots,
    });
  } catch (error) {
    console.error('Fetch Slots Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch slots.' });
  }
});

// POST /api/bookings - Book a new procurement slot & generate digital token
router.post('/book', authenticateToken, async (req, res) => {
  try {
    const {
      centre_id,
      slot_id,
      crop_name,
      crop_variety,
      estimated_quantity_quintals,
      vehicle_type,
      vehicle_number,
    } = req.body;

    if (!centre_id || !slot_id || !crop_name || !estimated_quantity_quintals || !vehicle_number) {
      return res.status(400).json({
        success: false,
        message: 'All fields (centre, slot, crop, quantity, vehicle number) are required.',
      });
    }

    const estQty = parseFloat(estimated_quantity_quintals);

    const vehicleCapMap = {
      'Bullock Cart': 30,
      'Mini Truck (Tata Ace/407)': 70,
      'Tractor Trolley': 100,
      'Heavy Truck': 300,
    };
    if (vehicle_type && vehicleCapMap[vehicle_type] && estQty > vehicleCapMap[vehicle_type]) {
      return res.status(400).json({
        success: false,
        message: `Quantity (${estQty} Qtl) exceeds maximum capacity of ${vehicle_type} (${vehicleCapMap[vehicle_type]} Qtl). Please choose a suitable vehicle.`,
      });
    }

    let slot = null;
    let centre = null;

    if (!isUsingMockStore && pool) {
      const slotRes = await pool.query('SELECT * FROM slots WHERE id = $1', [slot_id]);
      if (slotRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Selected slot does not exist.' });
      }
      slot = slotRes.rows[0];

      const centreRes = await pool.query('SELECT * FROM centres WHERE id = $1', [centre_id]);
      if (centreRes.rows.length > 0) centre = centreRes.rows[0];
    } else {
      slot = inMemoryStore.slots.find(s => s.id === slot_id);
      if (!slot) {
        return res.status(404).json({ success: false, message: 'Selected slot does not exist.' });
      }
      centre = inMemoryStore.centres.find(c => c.id === centre_id);
    }

    if (parseInt(slot.booked_tokens, 10) >= parseInt(slot.max_tokens, 10)) {
      return res.status(400).json({ success: false, message: 'Selected slot is fully booked. Please pick another slot.' });
    }

    const centreCode = centre ? centre.code.split('-')[1] || 'MND' : 'MND';
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const tokenNumber = `TK-${centreCode}-${randomSeq}`;
    const bookingId = `bk_${Date.now()}`;

    const newBooking = {
      id: bookingId,
      token_number: tokenNumber,
      farmer_id: req.user.id,
      centre_id,
      slot_id,
      crop_name,
      crop_variety: crop_variety || 'Standard FAQ',
      estimated_quantity_quintals: estQty,
      vehicle_type: vehicle_type || 'Tractor Trolley',
      vehicle_number: vehicle_number.toUpperCase().trim(),
      status: 'BOOKED',
      current_station: 'EN_ROUTE',
      qr_code_hash: `KISANSETU_${tokenNumber}_${req.user.phone}_${bookingId}`,
      created_at: new Date().toISOString(),
    };

    if (!isUsingMockStore && pool) {
      // Execute within transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query(
          `INSERT INTO bookings (id, token_number, farmer_id, centre_id, slot_id, crop_name, crop_variety, estimated_quantity_quintals, vehicle_type, vehicle_number, status, current_station, qr_code_hash, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [newBooking.id, newBooking.token_number, newBooking.farmer_id, newBooking.centre_id, newBooking.slot_id, newBooking.crop_name, newBooking.crop_variety, newBooking.estimated_quantity_quintals, newBooking.vehicle_type, newBooking.vehicle_number, newBooking.status, newBooking.current_station, newBooking.qr_code_hash, newBooking.created_at]
        );

        await client.query(
          `UPDATE slots 
           SET booked_tokens = booked_tokens + 1, booked_capacity_quintals = booked_capacity_quintals + $1 
           WHERE id = $2`,
          [estQty, slot_id]
        );

        await client.query(
          `INSERT INTO queue_audit_logs (id, booking_id, from_status, to_status, station, timestamp)
           VALUES ($1, $2, 'NONE', 'BOOKED', 'ONLINE_BOOKING', $3)`,
          [`log_${Date.now()}`, bookingId, new Date().toISOString()]
        );

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    inMemoryStore.bookings.push(newBooking);

    // Broadcast realtime update to Mandi Officer and Queue Screens
    broadcastQueueUpdate(centre_id);

    return res.status(201).json({
      success: true,
      message: 'Slot booked successfully! Your digital gate pass has been generated.',
      booking: {
        ...newBooking,
        centre_name: centre ? centre.name : 'Procurement Centre',
        centre_address: centre ? centre.address : '',
        slot_date: slot.slot_date,
        slot_time: `${slot.start_time} - ${slot.end_time}`,
      },
    });
  } catch (error) {
    console.error('Slot Booking Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process booking.' });
  }
});

// GET /api/bookings/my - Get all bookings for the logged-in farmer
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const farmerId = req.user.id;
    let enhancedBookings = [];

    if (!isUsingMockStore && pool) {
      const dbRes = await pool.query(
        `SELECT 
           b.*,
           c.name as centre_name,
           c.address as centre_address,
           s.slot_date,
           s.start_time,
           s.end_time,
           row_to_json(q.*) as quality_check,
           row_to_json(w.*) as weighbridge_log,
           row_to_json(p.*) as payment_info
         FROM bookings b
         LEFT JOIN centres c ON b.centre_id = c.id
         LEFT JOIN slots s ON b.slot_id = s.id
         LEFT JOIN quality_checks q ON b.id = q.booking_id
         LEFT JOIN weighbridge_logs w ON b.id = w.booking_id
         LEFT JOIN payments p ON b.id = p.booking_id
         WHERE b.farmer_id = $1
         ORDER BY b.created_at DESC`,
        [farmerId]
      );

      enhancedBookings = dbRes.rows.map(b => ({
        ...b,
        slot_time: b.start_time ? `${b.start_time} - ${b.end_time}` : '08:00 - 10:00',
        quality_check: b.quality_check || null,
        weighbridge_log: b.weighbridge_log || null,
        payment_info: b.payment_info || null,
      }));
    } else {
      const bookings = inMemoryStore.bookings.filter(b => b.farmer_id === farmerId);
      enhancedBookings = bookings.map(b => {
        const centre = inMemoryStore.centres.find(c => c.id === b.centre_id);
        const slot = inMemoryStore.slots.find(s => s.id === b.slot_id);
        const quality = inMemoryStore.quality_checks.find(q => q.booking_id === b.id);
        const weighbridge = inMemoryStore.weighbridge_logs.find(w => w.booking_id === b.id);
        const payment = inMemoryStore.payments.find(p => p.booking_id === b.id);

        return {
          ...b,
          centre_name: centre ? centre.name : 'Procurement Mandi',
          centre_address: centre ? centre.address : '',
          slot_date: slot ? slot.slot_date : 'Today',
          slot_time: slot ? `${slot.start_time} - ${slot.end_time}` : '08:00 - 10:00',
          quality_check: quality || null,
          weighbridge_log: weighbridge || null,
          payment_info: payment || null,
        };
      }).reverse();
    }

    return res.json({
      success: true,
      bookings: enhancedBookings,
    });
  } catch (error) {
    console.error('Fetch My Bookings Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch your bookings.' });
  }
});

// GET /api/bookings/:id - Single booking pass details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let bookingData = null;

    if (!isUsingMockStore && pool) {
      const dbRes = await pool.query(
        `SELECT 
           b.*,
           u.full_name as farmer_name,
           u.phone as farmer_phone,
           c.name as centre_name,
           c.code as centre_code,
           c.address as centre_address,
           s.slot_date,
           s.start_time,
           s.end_time,
           row_to_json(q.*) as quality_check,
           row_to_json(w.*) as weighbridge_log,
           row_to_json(p.*) as payment_info
         FROM bookings b
         LEFT JOIN users u ON b.farmer_id = u.id
         LEFT JOIN centres c ON b.centre_id = c.id
         LEFT JOIN slots s ON b.slot_id = s.id
         LEFT JOIN quality_checks q ON b.id = q.booking_id
         LEFT JOIN weighbridge_logs w ON b.id = w.booking_id
         LEFT JOIN payments p ON b.id = p.booking_id
         WHERE b.id = $1 OR b.token_number = $1`,
        [id]
      );

      if (dbRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }

      const b = dbRes.rows[0];

      // Calculate queue position ahead
      const aheadRes = await pool.query(
        `SELECT COUNT(*) as count FROM bookings 
         WHERE centre_id = $1 
           AND status IN ('CHECKED_IN', 'CALLED', 'QUALITY_INSPECTION') 
           AND created_at < $2`,
        [b.centre_id, b.created_at]
      );
      const activeAheadCount = parseInt(aheadRes.rows[0]?.count || '0', 10);

      bookingData = {
        ...b,
        slot_time: b.start_time ? `${b.start_time} - ${b.end_time}` : '',
        queue_position_ahead: activeAheadCount,
        estimated_wait_minutes: activeAheadCount * 12 + 10,
        quality_check: b.quality_check || null,
        weighbridge_log: b.weighbridge_log || null,
        payment_info: b.payment_info || null,
      };
    } else {
      const booking = inMemoryStore.bookings.find(b => b.id === id || b.token_number === id);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }

      const centre = inMemoryStore.centres.find(c => c.id === booking.centre_id);
      const slot = inMemoryStore.slots.find(s => s.id === booking.slot_id);
      const farmer = inMemoryStore.users.find(u => u.id === booking.farmer_id);
      const quality = inMemoryStore.quality_checks.find(q => q.booking_id === booking.id);
      const weighbridge = inMemoryStore.weighbridge_logs.find(w => w.booking_id === booking.id);
      const payment = inMemoryStore.payments.find(p => p.booking_id === booking.id);

      const activeAhead = inMemoryStore.bookings.filter(
        b => b.centre_id === booking.centre_id &&
             ['CHECKED_IN', 'CALLED', 'QUALITY_INSPECTION'].includes(b.status) &&
             new Date(b.created_at) < new Date(booking.created_at)
      );

      bookingData = {
        ...booking,
        farmer_name: farmer ? farmer.full_name : 'Registered Farmer',
        farmer_phone: farmer ? farmer.phone : '',
        centre_name: centre ? centre.name : 'Procurement Mandi',
        centre_code: centre ? centre.code : '',
        centre_address: centre ? centre.address : '',
        slot_date: slot ? slot.slot_date : 'Today',
        slot_time: slot ? `${slot.start_time} - ${slot.end_time}` : '',
        queue_position_ahead: activeAhead.length,
        estimated_wait_minutes: activeAhead.length * 12 + 10,
        quality_check: quality || null,
        weighbridge_log: weighbridge || null,
        payment_info: payment || null,
      };
    }

    return res.json({
      success: true,
      booking: bookingData,
    });
  } catch (error) {
    console.error('Fetch Booking Pass Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch booking pass.' });
  }
});

// POST /api/bookings/:id/cancel
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUsingMockStore && pool) {
      const bRes = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
      if (bRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }
      const b = bRes.rows[0];

      if (b.status !== 'BOOKED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel a booking that has already arrived or entered the queue.',
        });
      }

      let centreIdToBroadcast = null;

      await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', ['CANCELLED', id]);
      await pool.query(
        'UPDATE slots SET booked_tokens = GREATEST(0, booked_tokens - 1), booked_capacity_quintals = GREATEST(0, booked_capacity_quintals - $1) WHERE id = $2',
        [parseFloat(b.estimated_quantity_quintals), b.slot_id]
      );
      centreIdToBroadcast = b.centre_id;
    } else {
      const booking = inMemoryStore.bookings.find(b => b.id === id);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }
      if (booking.status !== 'BOOKED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel a booking that has already arrived or entered the queue.',
        });
      }
      booking.status = 'CANCELLED';
      const slot = inMemoryStore.slots.find(s => s.id === booking.slot_id);
      if (slot && slot.booked_tokens > 0) {
        slot.booked_tokens -= 1;
        slot.booked_capacity_quintals = Math.max(0, slot.booked_capacity_quintals - booking.estimated_quantity_quintals);
      }
      centreIdToBroadcast = booking.centre_id;
    }

    if (centreIdToBroadcast) {
      broadcastQueueUpdate(centreIdToBroadcast);
    }

    return res.json({ success: true, message: 'Booking cancelled successfully.' });
  } catch (error) {
    console.error('Cancel Booking Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel booking.' });
  }
});

export default router;
