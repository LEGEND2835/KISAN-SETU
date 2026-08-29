import express from 'express';
import { inMemoryStore, isUsingMockStore, pool, query } from '../db/index.js';

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

export default router;
