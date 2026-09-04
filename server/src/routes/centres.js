import express from 'express';
import { inMemoryStore, isUsingMockStore, pool, query } from '../db/index.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// GET /api/centres - List centres with optional filtering by state, district, crop
router.get('/', async (req, res) => {
  try {
    const { state, district, crop } = req.query;

    let centres = [];

    if (!isUsingMockStore && pool) {
      let sql = 'SELECT * FROM centres WHERE is_active = TRUE';
      const params = [];

      if (state) {
        params.push(state.toLowerCase());
        sql += ` AND LOWER(state) = $${params.length}`;
      }
      if (district) {
        params.push(district.toLowerCase());
        sql += ` AND LOWER(district) = $${params.length}`;
      }

      const result = await pool.query(sql, params);
      centres = result.rows;
    } else {
      centres = [...inMemoryStore.centres];
      if (state) {
        centres = centres.filter(c => c.state.toLowerCase() === state.toLowerCase());
      }
      if (district) {
        centres = centres.filter(c => c.district.toLowerCase() === district.toLowerCase());
      }
    }

    if (crop) {
      centres = centres.filter(c => {
        const supported = typeof c.supported_crops === 'string' ? JSON.parse(c.supported_crops) : c.supported_crops;
        return Array.isArray(supported) && supported.some(sc => sc.toLowerCase().includes(crop.toLowerCase()));
      });
    }

    // Enhance each centre with live load/queue statistics
    const enhancedCentres = await Promise.all(
      centres.map(async (c) => {
        let activeBookingsCount = 0;
        let totalTodayCount = 0;

        if (!isUsingMockStore && pool) {
          const countRes = await pool.query(
            `SELECT 
              COUNT(*) FILTER (WHERE status IN ('CHECKED_IN', 'CALLED', 'QUALITY_INSPECTION', 'WEIGHING', 'UNLOADING')) as active_count,
              COUNT(*) as total_count
             FROM bookings WHERE centre_id = $1`,
            [c.id]
          );
          activeBookingsCount = parseInt(countRes.rows[0]?.active_count || '0', 10);
          totalTodayCount = parseInt(countRes.rows[0]?.total_count || '0', 10);
        } else {
          const activeBookings = inMemoryStore.bookings.filter(
            b => b.centre_id === c.id && ['CHECKED_IN', 'CALLED', 'QUALITY_INSPECTION', 'WEIGHING', 'UNLOADING'].includes(b.status)
          );
          const totalToday = inMemoryStore.bookings.filter(b => b.centre_id === c.id);
          activeBookingsCount = activeBookings.length;
          totalTodayCount = totalToday.length;
        }

        const supportedCrops = typeof c.supported_crops === 'string' ? JSON.parse(c.supported_crops) : c.supported_crops;

        return {
          ...c,
          supported_crops: supportedCrops,
          active_in_queue_count: activeBookingsCount,
          total_today_count: totalTodayCount,
          congestion_level: activeBookingsCount > 8 ? 'HIGH' : activeBookingsCount > 4 ? 'MODERATE' : 'LOW',
          avg_wait_minutes: activeBookingsCount * 12 + 10,
        };
      })
    );

    return res.json({
      success: true,
      count: enhancedCentres.length,
      centres: enhancedCentres,
    });
  } catch (error) {
    console.error('Fetch Centres Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch procurement centres.' });
  }
});

// GET /api/centres/:id - Detailed centre information
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let centre = null;
    let activeQueueCount = 0;

    if (!isUsingMockStore && pool) {
      const resDb = await pool.query('SELECT * FROM centres WHERE id = $1 OR code = $1', [id]);
      if (resDb.rows.length > 0) centre = resDb.rows[0];

      if (centre) {
        const countRes = await pool.query(
          `SELECT COUNT(*) as active_count FROM bookings 
           WHERE centre_id = $1 AND status IN ('CHECKED_IN', 'CALLED', 'QUALITY_INSPECTION', 'WEIGHING', 'UNLOADING')`,
          [centre.id]
        );
        activeQueueCount = parseInt(countRes.rows[0]?.active_count || '0', 10);
      }
    } else {
      centre = inMemoryStore.centres.find(c => c.id === id || c.code === id);
      if (centre) {
        const activeBookings = inMemoryStore.bookings.filter(
          b => b.centre_id === centre.id && ['CHECKED_IN', 'CALLED', 'QUALITY_INSPECTION', 'WEIGHING', 'UNLOADING'].includes(b.status)
        );
        activeQueueCount = activeBookings.length;
      }
    }

    if (!centre) {
      return res.status(404).json({ success: false, message: 'Centre not found.' });
    }

    const supportedCrops = typeof centre.supported_crops === 'string' ? JSON.parse(centre.supported_crops) : centre.supported_crops;

    return res.json({
      success: true,
      centre: {
        ...centre,
        supported_crops: supportedCrops,
        active_queue_count: activeQueueCount,
        estimated_turnaround_time_mins: activeQueueCount * 14 + 15,
        current_status: centre.is_active ? 'OPERATIONAL' : 'CLOSED',
      },
    });
  } catch (error) {
    console.error('Fetch Centre By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch centre details.' });
  }
});

// POST /api/centres - Add a new Mandi / Procurement Centre
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'centre_officer'),
  async (req, res) => {
  try {
    const {
      name,
      code,
      state,
      district,
      address,
      daily_capacity_quintals,
      max_concurrent_trucks,
      supported_crops,
      contact_phone,
      operating_hours,
      latitude,
      longitude,
    } = req.body;

    if (!name || !state || !district || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, state, district, and address are required.',
      });
    }

    const cleanCode = code
      ? code.trim().toUpperCase()
      : `MND-${district.trim().slice(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;

    // Check code uniqueness
    if (!isUsingMockStore && pool) {
      const codeCheck = await pool.query('SELECT id FROM centres WHERE UPPER(code) = $1', [cleanCode]);
      if (codeCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: `A Mandi with code "${cleanCode}" already exists.`,
        });
      }
    } else {
      const existing = inMemoryStore.centres.find(c => c.code.toUpperCase() === cleanCode);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `A Mandi with code "${cleanCode}" already exists.`,
        });
      }
    }

    const centreId = `ctr_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
    const cropsArr = supported_crops && Array.isArray(supported_crops) && supported_crops.length > 0
      ? supported_crops
      : ['Wheat', 'Paddy', 'Mustard', 'Gram', 'Maize', 'Soybean'];
    const capacityQtl = parseInt(daily_capacity_quintals || '5000', 10);
    const trucksCount = parseInt(max_concurrent_trucks || '10', 10);
    const hours = operating_hours || '08:00 AM - 06:00 PM';
    const phone = contact_phone || '0184-225588';
    const lat = parseFloat(latitude || '29.6857');
    const lng = parseFloat(longitude || '76.9905');

    const newCentre = {
      id: centreId,
      name: name.trim(),
      code: cleanCode,
      state: state.trim(),
      district: district.trim(),
      address: address.trim(),
      latitude: lat,
      longitude: lng,
      daily_capacity_quintals: capacityQtl,
      max_concurrent_trucks: trucksCount,
      supported_crops: cropsArr,
      contact_phone: phone,
      operating_hours: hours,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    if (!isUsingMockStore && pool) {
      await pool.query(
        `INSERT INTO centres (id, name, code, state, district, address, latitude, longitude, daily_capacity_quintals, max_concurrent_trucks, supported_crops, contact_phone, operating_hours, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE)`,
        [
          newCentre.id,
          newCentre.name,
          newCentre.code,
          newCentre.state,
          newCentre.district,
          newCentre.address,
          newCentre.latitude,
          newCentre.longitude,
          newCentre.daily_capacity_quintals,
          newCentre.max_concurrent_trucks,
          JSON.stringify(newCentre.supported_crops),
          newCentre.contact_phone,
          newCentre.operating_hours,
        ]
      );

      // Provision initial slot windows for the next 7 days
      const windows = [
        { start: '08:00:00', end: '10:00:00', cap: 1000 },
        { start: '10:00:00', end: '12:00:00', cap: 1200 },
        { start: '12:00:00', end: '14:00:00', cap: 1000 },
        { start: '14:00:00', end: '16:00:00', cap: 1000 },
        { start: '16:00:00', end: '18:00:00', cap: 800 },
      ];

      for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
        const d = new Date();
        d.setDate(d.getDate() + dayOffset);
        const dateStr = d.toISOString().split('T')[0];

        for (const w of windows) {
          const slotId = `slt_${newCentre.code.toLowerCase()}_${dateStr}_${w.start.replace(/:/g, '')}`;
          await pool.query(
            `INSERT INTO slots (id, centre_id, slot_date, start_time, end_time, max_capacity_quintals, booked_capacity_quintals, max_tokens, booked_tokens, status)
             VALUES ($1, $2, $3, $4, $5, $6, 0, 20, 0, 'OPEN')
             ON CONFLICT (centre_id, slot_date, start_time, end_time) DO NOTHING`,
            [slotId, newCentre.id, dateStr, w.start, w.end, w.cap]
          );
        }
      }
    }

    // Sync to in-memory fallback
    inMemoryStore.centres.push(newCentre);

    return res.status(201).json({
      success: true,
      message: 'Mandi Procurement Centre added successfully.',
      centre: newCentre,
    });
  } catch (error) {
    console.error('Add Centre Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add procurement centre.' });
  }
});

// PUT /api/centres/:id - Edit Mandi details
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'centre_officer'),
  async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      state,
      district,
      daily_capacity_quintals,
      max_concurrent_trucks,
      supported_crops,
      contact_phone,
      operating_hours,
      is_active,
    } = req.body;

    let centre = null;
    if (!isUsingMockStore && pool) {
      const cRes = await pool.query('SELECT * FROM centres WHERE id = $1 OR code = $1', [id]);
      if (cRes.rows.length > 0) centre = cRes.rows[0];
    } else {
      centre = inMemoryStore.centres.find(c => c.id === id || c.code === id);
    }

    if (!centre) {
      return res.status(404).json({ success: false, message: 'Centre not found.' });
    }

    const updatedName = name !== undefined ? name.trim() : centre.name;
    const updatedAddress = address !== undefined ? address.trim() : centre.address;
    const updatedState = state !== undefined ? state.trim() : centre.state;
    const updatedDistrict = district !== undefined ? district.trim() : centre.district;
    const updatedCapacity = daily_capacity_quintals !== undefined ? parseInt(daily_capacity_quintals, 10) : centre.daily_capacity_quintals;
    const updatedTrucks = max_concurrent_trucks !== undefined ? parseInt(max_concurrent_trucks, 10) : centre.max_concurrent_trucks;
    const updatedCrops = supported_crops !== undefined ? (Array.isArray(supported_crops) ? supported_crops : JSON.parse(supported_crops || '[]')) : (typeof centre.supported_crops === 'string' ? JSON.parse(centre.supported_crops) : centre.supported_crops);
    const updatedPhone = contact_phone !== undefined ? contact_phone.trim() : (centre.contact_phone || '');
    const updatedHours = operating_hours !== undefined ? operating_hours.trim() : (centre.operating_hours || '08:00 AM - 06:00 PM');
    const updatedActive = is_active !== undefined ? Boolean(is_active) : centre.is_active;

    if (!isUsingMockStore && pool) {
      await pool.query(
        `UPDATE centres
         SET name = $1,
             address = $2,
             state = $3,
             district = $4,
             daily_capacity_quintals = $5,
             max_concurrent_trucks = $6,
             supported_crops = $7,
             contact_phone = $8,
             operating_hours = $9,
             is_active = $10
         WHERE id = $11`,
        [
          updatedName,
          updatedAddress,
          updatedState,
          updatedDistrict,
          updatedCapacity,
          updatedTrucks,
          JSON.stringify(updatedCrops),
          updatedPhone,
          updatedHours,
          updatedActive,
          centre.id,
        ]
      );
    }

    const updatedCentreObj = {
      ...centre,
      name: updatedName,
      address: updatedAddress,
      state: updatedState,
      district: updatedDistrict,
      daily_capacity_quintals: updatedCapacity,
      max_concurrent_trucks: updatedTrucks,
      supported_crops: updatedCrops,
      contact_phone: updatedPhone,
      operating_hours: updatedHours,
      is_active: updatedActive,
    };

    const memIdx = inMemoryStore.centres.findIndex(c => c.id === centre.id);
    if (memIdx !== -1) inMemoryStore.centres[memIdx] = updatedCentreObj;

    return res.json({
      success: true,
      message: 'Mandi details updated successfully.',
      centre: updatedCentreObj,
    });
  } catch (error) {
    console.error('Update Centre Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update Mandi details.' });
  }
});

export default router;
