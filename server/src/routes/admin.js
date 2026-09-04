import express from 'express';
import bcrypt from 'bcryptjs';
import { inMemoryStore, isUsingMockStore, pool, query } from '../db/index.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { broadcastQueueUpdate } from '../sockets/queueSocket.js';

const router = express.Router();

// Guard all admin routes with authentication and admin role authorization
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// 1. GET /api/admin/overview - High-level system statistics
router.get('/overview', async (req, res) => {
  try {
    let totalFarmers = 0;
    let totalOfficers = 0;
    let totalCentres = 0;
    let activeCentres = 0;
    let totalBookings = 0;
    let totalProcuredQuintals = 0;
    let totalDbtPayout = 0;
    let recentAuditLogs = [];

    if (!isUsingMockStore && pool) {
      // User counts
      const userRes = await pool.query(`
        SELECT 
          COUNT(CASE WHEN role = 'farmer' THEN 1 END) as farmers_count,
          COUNT(CASE WHEN role IN ('centre_officer', 'quality_inspector', 'weighbridge_operator', 'admin') THEN 1 END) as officers_count
        FROM users
      `);
      if (userRes.rows.length > 0) {
        totalFarmers = parseInt(userRes.rows[0].farmers_count || '0', 10);
        totalOfficers = parseInt(userRes.rows[0].officers_count || '0', 10);
      }

      // Centres count
      const centreRes = await pool.query(`
        SELECT 
          COUNT(*) as total_centres,
          COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_centres
        FROM centres
      `);
      if (centreRes.rows.length > 0) {
        totalCentres = parseInt(centreRes.rows[0].total_centres || '0', 10);
        activeCentres = parseInt(centreRes.rows[0].active_centres || '0', 10);
      }

      // Procurement totals
      const procRes = await pool.query(`
        SELECT 
          COUNT(b.id) as total_bookings,
          COALESCE(SUM(w.net_weight_quintals), 0) as total_procured_weight,
          COALESCE(SUM(p.net_payable_amount), 0) as total_payout
        FROM bookings b
        LEFT JOIN weighbridge_logs w ON b.id = w.booking_id
        LEFT JOIN payments p ON b.id = p.booking_id
      `);
      if (procRes.rows.length > 0) {
        totalBookings = parseInt(procRes.rows[0].total_bookings || '0', 10);
        totalProcuredQuintals = parseFloat(procRes.rows[0].total_procured_weight || '0');
        totalDbtPayout = parseFloat(procRes.rows[0].total_payout || '0');
      }

      // Recent audit logs
      const logRes = await pool.query(`
        SELECT q.*, b.token_number, b.crop_name
        FROM queue_audit_logs q
        LEFT JOIN bookings b ON q.booking_id = b.id
        ORDER BY q.timestamp DESC
        LIMIT 10
      `);
      recentAuditLogs = logRes.rows;
    } else {
      totalFarmers = inMemoryStore.users.filter(u => u.role === 'farmer').length;
      totalOfficers = inMemoryStore.users.filter(u => u.role !== 'farmer').length;
      totalCentres = inMemoryStore.centres.length;
      activeCentres = inMemoryStore.centres.filter(c => c.is_active !== false).length;
      totalBookings = inMemoryStore.bookings.length;
      totalProcuredQuintals = inMemoryStore.weighbridge_logs.reduce((acc, w) => acc + (parseFloat(w.net_weight_quintals) || 0), 0);
      totalDbtPayout = inMemoryStore.payments.reduce((acc, p) => acc + (parseFloat(p.net_payable_amount) || 0), 0);
      recentAuditLogs = [...inMemoryStore.queue_audit_logs].slice(-10).reverse().map(l => {
        const b = inMemoryStore.bookings.find(x => x.id === l.booking_id);
        return { ...l, token_number: b?.token_number || 'N/A', crop_name: b?.crop_name || 'Grain' };
      });
    }

    return res.json({
      success: true,
      stats: {
        total_farmers: totalFarmers,
        total_officers: totalOfficers,
        total_centres: totalCentres,
        active_centres: activeCentres,
        total_bookings: totalBookings,
        total_procured_quintals: totalProcuredQuintals,
        total_dbt_payout: totalDbtPayout,
        system_status: 'OPERATIONAL',
        server_time: new Date().toISOString(),
      },
      recent_activity: recentAuditLogs,
    });
  } catch (error) {
    console.error('Admin Overview Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin overview.' });
  }
});

// 2. GET /api/admin/farmers - List and search farmer accounts
router.get('/farmers', async (req, res) => {
  try {
    const { q, state, district } = req.query;
    let farmers = [];

    if (!isUsingMockStore && pool) {
      let sql = `
        SELECT 
          u.id, u.full_name, u.phone, u.email, u.role, u.state, u.district, u.village, 
          u.aadhaar_last4, u.bank_account_last4, u.ifsc_code, u.created_at,
          COUNT(b.id) as total_bookings,
          COALESCE(SUM(CASE WHEN b.status = 'PROCURED' THEN b.estimated_quantity_quintals END), 0) as total_sold_quintals
        FROM users u
        LEFT JOIN bookings b ON u.id = b.farmer_id
        WHERE u.role = 'farmer'
      `;
      const params = [];

      if (q) {
        params.push(`%${q.toLowerCase()}%`);
        sql += ` AND (LOWER(u.full_name) LIKE $${params.length} OR u.phone LIKE $${params.length} OR LOWER(u.district) LIKE $${params.length} OR LOWER(u.village) LIKE $${params.length})`;
      }
      if (state) {
        params.push(state.toLowerCase());
        sql += ` AND LOWER(u.state) = $${params.length}`;
      }
      if (district) {
        params.push(district.toLowerCase());
        sql += ` AND LOWER(u.district) = $${params.length}`;
      }

      sql += ` GROUP BY u.id ORDER BY u.created_at DESC`;
      const dbRes = await pool.query(sql, params);
      farmers = dbRes.rows.map(f => ({
        ...f,
        total_bookings: parseInt(f.total_bookings || '0', 10),
        total_sold_quintals: parseFloat(f.total_sold_quintals || '0'),
      }));
    } else {
      let list = inMemoryStore.users.filter(u => u.role === 'farmer');
      if (q) {
        const queryStr = q.toLowerCase();
        list = list.filter(u => 
          u.full_name.toLowerCase().includes(queryStr) || 
          u.phone.includes(queryStr) || 
          u.district.toLowerCase().includes(queryStr) ||
          (u.village && u.village.toLowerCase().includes(queryStr))
        );
      }
      if (state) list = list.filter(u => u.state.toLowerCase() === state.toLowerCase());
      if (district) list = list.filter(u => u.district.toLowerCase() === district.toLowerCase());

      farmers = list.map(f => {
        const bList = inMemoryStore.bookings.filter(b => b.farmer_id === f.id);
        const soldQty = bList.filter(b => b.status === 'PROCURED').reduce((acc, b) => acc + parseFloat(b.estimated_quantity_quintals || 0), 0);
        return {
          id: f.id,
          full_name: f.full_name,
          phone: f.phone,
          email: f.email,
          role: f.role,
          state: f.state,
          district: f.district,
          village: f.village || '',
          aadhaar_last4: f.aadhaar_last4 || '0000',
          bank_account_last4: f.bank_account_last4 || '0000',
          ifsc_code: f.ifsc_code || 'SBIN0001000',
          created_at: f.created_at || new Date().toISOString(),
          total_bookings: bList.length,
          total_sold_quintals: soldQty,
        };
      });
    }

    return res.json({
      success: true,
      count: farmers.length,
      farmers,
    });
  } catch (error) {
    console.error('Fetch Farmers Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch farmers directory.' });
  }
});

// 3. GET /api/admin/farmers/:id - Individual farmer details and booking history
router.get('/farmers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let farmer = null;
    let bookings = [];

    if (!isUsingMockStore && pool) {
      const uRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (uRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Farmer not found.' });
      farmer = uRes.rows[0];

      const bRes = await pool.query(`
        SELECT b.*, c.name as centre_name, s.slot_date, s.start_time, s.end_time, p.net_payable_amount, p.payment_status
        FROM bookings b
        LEFT JOIN centres c ON b.centre_id = c.id
        LEFT JOIN slots s ON b.slot_id = s.id
        LEFT JOIN payments p ON b.id = p.booking_id
        WHERE b.farmer_id = $1
        ORDER BY b.created_at DESC
      `, [id]);
      bookings = bRes.rows;
    } else {
      farmer = inMemoryStore.users.find(u => u.id === id);
      if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found.' });

      bookings = inMemoryStore.bookings.filter(b => b.farmer_id === id).map(b => {
        const c = inMemoryStore.centres.find(x => x.id === b.centre_id);
        const s = inMemoryStore.slots.find(x => x.id === b.slot_id);
        const p = inMemoryStore.payments.find(x => x.booking_id === b.id);
        return {
          ...b,
          centre_name: c?.name || 'Mandi Centre',
          slot_date: s?.slot_date || 'Today',
          start_time: s?.start_time || '08:00',
          end_time: s?.end_time || '10:00',
          net_payable_amount: p?.net_payable_amount || 0,
          payment_status: p?.payment_status || 'PENDING',
        };
      });
    }

    return res.json({
      success: true,
      farmer: {
        id: farmer.id,
        full_name: farmer.full_name,
        phone: farmer.phone,
        email: farmer.email,
        role: farmer.role,
        state: farmer.state,
        district: farmer.district,
        village: farmer.village,
        address: farmer.address || farmer.village,
        aadhaar_last4: farmer.aadhaar_last4,
        bank_account_last4: farmer.bank_account_last4,
        ifsc_code: farmer.ifsc_code,
        created_at: farmer.created_at,
      },
      bookings,
    });
  } catch (error) {
    console.error('Fetch Farmer Details Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve farmer profile.' });
  }
});

// 4. PUT /api/admin/farmers/:id - Edit farmer profile details
router.put('/farmers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, state, district, village, address, aadhaar_last4, bank_account_last4, ifsc_code } = req.body;

    let user = null;
    if (!isUsingMockStore && pool) {
      const uRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (uRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Farmer not found.' });
      user = uRes.rows[0];

      await pool.query(`
        UPDATE users
        SET full_name = COALESCE($1, full_name),
            phone = COALESCE($2, phone),
            state = COALESCE($3, state),
            district = COALESCE($4, district),
            village = COALESCE($5, village),
            address = COALESCE($6, address),
            aadhaar_last4 = COALESCE($7, aadhaar_last4),
            bank_account_last4 = COALESCE($8, bank_account_last4),
            ifsc_code = COALESCE($9, ifsc_code)
        WHERE id = $10
      `, [full_name, phone, state, district, village, address || village, aadhaar_last4, bank_account_last4, ifsc_code, id]);

      const updatedRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      user = updatedRes.rows[0];
    } else {
      user = inMemoryStore.users.find(u => u.id === id);
      if (!user) return res.status(404).json({ success: false, message: 'Farmer not found.' });

      if (full_name !== undefined) user.full_name = full_name;
      if (phone !== undefined) user.phone = phone;
      if (state !== undefined) user.state = state;
      if (district !== undefined) user.district = district;
      if (village !== undefined) user.village = village;
      if (address !== undefined) user.address = address;
      if (aadhaar_last4 !== undefined) user.aadhaar_last4 = aadhaar_last4;
      if (bank_account_last4 !== undefined) user.bank_account_last4 = bank_account_last4;
      if (ifsc_code !== undefined) user.ifsc_code = ifsc_code;
    }

    return res.json({
      success: true,
      message: `Farmer "${user.full_name}" updated successfully.`,
      farmer: user,
    });
  } catch (error) {
    console.error('Update Farmer Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update farmer record.' });
  }
});

// 5. GET /api/admin/officers - List all Mandi staff and officers
router.get('/officers', async (req, res) => {
  try {
    let officers = [];

    if (!isUsingMockStore && pool) {
      const dbRes = await pool.query(`
        SELECT 
          u.id, u.full_name, u.phone, u.email, u.role, u.designation, u.centre_id, u.state, u.district, u.created_at,
          c.name as centre_name, c.code as centre_code
        FROM users u
        LEFT JOIN centres c ON u.centre_id = c.id
        WHERE u.role IN ('centre_officer', 'quality_inspector', 'weighbridge_operator', 'admin')
        ORDER BY u.created_at DESC
      `);
      officers = dbRes.rows;
    } else {
      const staff = inMemoryStore.users.filter(u => ['centre_officer', 'quality_inspector', 'weighbridge_operator', 'admin'].includes(u.role));
      officers = staff.map(u => {
        const c = inMemoryStore.centres.find(x => x.id === u.centre_id);
        return {
          id: u.id,
          full_name: u.full_name,
          phone: u.phone,
          email: u.email,
          role: u.role,
          designation: u.designation || (u.role === 'centre_officer' ? 'Mandi Supervisor' : u.role === 'quality_inspector' ? 'Quality Analyst' : u.role === 'weighbridge_operator' ? 'Weighbridge In-charge' : 'Director'),
          centre_id: u.centre_id || '',
          centre_name: c ? c.name : 'All Centres (Central)',
          centre_code: c ? c.code : 'MND-ALL',
          state: u.state || 'Haryana',
          district: u.district || 'Karnal',
          created_at: u.created_at || new Date().toISOString(),
        };
      });
    }

    return res.json({
      success: true,
      count: officers.length,
      officers,
    });
  } catch (error) {
    console.error('Fetch Officers Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch officers directory.' });
  }
});

// 6. POST /api/admin/officers - Create new Mandi officer / staff account
router.post('/officers', async (req, res) => {
  try {
    const { full_name, phone, role, password, designation, centre_id, state, district } = req.body;

    if (!full_name || !phone || !role) {
      return res.status(400).json({ success: false, message: 'Name, phone, and role are required.' });
    }

    const validRoles = ['centre_officer', 'quality_inspector', 'weighbridge_operator', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Role must be one of: ${validRoles.join(', ')}` });
    }

    // Check phone uniqueness
    if (!isUsingMockStore && pool) {
      const checkRes = await pool.query('SELECT id FROM users WHERE phone = $1', [phone.trim()]);
      if (checkRes.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'An account with this phone number already exists.' });
      }
    } else {
      const existing = inMemoryStore.users.find(u => u.phone === phone.trim());
      if (existing) {
        return res.status(400).json({ success: false, message: 'An account with this phone number already exists.' });
      }
    }

    const passwordHash = await bcrypt.hash(password || 'admin123', 8);
    const officerId = `usr_${role.slice(0, 3)}_${Date.now().toString().slice(-6)}`;
    const email = `${phone.trim()}@${role}.kisansetu.gov.in`;

    const newOfficer = {
      id: officerId,
      full_name: full_name.trim(),
      phone: phone.trim(),
      email,
      role,
      password_hash: passwordHash,
      designation: designation?.trim() || (role === 'centre_officer' ? 'Mandi Supervisor' : role === 'quality_inspector' ? 'Quality Inspector' : 'Weighbridge Operator'),
      centre_id: centre_id || null,
      state: state?.trim() || 'Haryana',
      district: district?.trim() || 'Karnal',
      village: 'Mandi Complex',
      aadhaar_last4: '0000',
      bank_account_last4: '0000',
      ifsc_code: 'SBIN0001000',
      created_at: new Date().toISOString(),
    };

    if (!isUsingMockStore && pool) {
      await pool.query(`
        INSERT INTO users (id, full_name, phone, email, role, password_hash, designation, centre_id, state, district, village, aadhaar_last4, bank_account_last4, ifsc_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [newOfficer.id, newOfficer.full_name, newOfficer.phone, newOfficer.email, newOfficer.role, newOfficer.password_hash, newOfficer.designation, newOfficer.centre_id, newOfficer.state, newOfficer.district, newOfficer.village, newOfficer.aadhaar_last4, newOfficer.bank_account_last4, newOfficer.ifsc_code]);
    }

    inMemoryStore.users.push(newOfficer);

    return res.status(201).json({
      success: true,
      message: `Staff member "${newOfficer.full_name}" registered successfully.`,
      officer: newOfficer,
    });
  } catch (error) {
    console.error('Create Officer Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create officer account.' });
  }
});

// 7. PUT /api/admin/officers/:id - Edit officer details, role, or assigned Mandi centre
router.put('/officers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, role, designation, centre_id, state, district } = req.body;

    let user = null;
    if (!isUsingMockStore && pool) {
      const uRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (uRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Staff member not found.' });
      user = uRes.rows[0];

      await pool.query(`
        UPDATE users
        SET full_name = COALESCE($1, full_name),
            phone = COALESCE($2, phone),
            role = COALESCE($3, role),
            designation = COALESCE($4, designation),
            centre_id = $5,
            state = COALESCE($6, state),
            district = COALESCE($7, district)
        WHERE id = $8
      `, [full_name, phone, role, designation, centre_id !== undefined ? (centre_id || null) : user.centre_id, state, district, id]);

      const updatedRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      user = updatedRes.rows[0];
    } else {
      user = inMemoryStore.users.find(u => u.id === id);
      if (!user) return res.status(404).json({ success: false, message: 'Staff member not found.' });

      if (full_name !== undefined) user.full_name = full_name;
      if (phone !== undefined) user.phone = phone;
      if (role !== undefined) user.role = role;
      if (designation !== undefined) user.designation = designation;
      if (centre_id !== undefined) user.centre_id = centre_id;
      if (state !== undefined) user.state = state;
      if (district !== undefined) user.district = district;
    }

    return res.json({
      success: true,
      message: `Staff member "${user.full_name}" updated successfully.`,
      officer: user,
    });
  } catch (error) {
    console.error('Update Officer Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update staff member.' });
  }
});

// 8. GET /api/admin/centres - Comprehensive Mandi Centre list with managers and capacity
router.get('/centres', async (req, res) => {
  try {
    let centres = [];

    if (!isUsingMockStore && pool) {
      const cRes = await pool.query(`
        SELECT 
          c.*,
          u.full_name as manager_name,
          u.phone as manager_phone,
          (SELECT COUNT(*) FROM slots s WHERE s.centre_id = c.id AND s.slot_date >= CURRENT_DATE) as active_slots_count,
          (SELECT COUNT(*) FROM bookings b WHERE b.centre_id = c.id AND b.status IN ('CHECKED_IN', 'CALLED', 'QUALITY_INSPECTION', 'WEIGHING', 'UNLOADING')) as active_queue_count
        FROM centres c
        LEFT JOIN users u ON c.manager_id = u.id
        ORDER BY c.created_at DESC
      `);
      centres = cRes.rows.map(c => ({
        ...c,
        supported_crops: typeof c.supported_crops === 'string' ? JSON.parse(c.supported_crops) : c.supported_crops,
        active_slots_count: parseInt(c.active_slots_count || '0', 10),
        active_queue_count: parseInt(c.active_queue_count || '0', 10),
      }));
    } else {
      centres = inMemoryStore.centres.map(c => {
        const mgr = inMemoryStore.users.find(u => u.id === c.manager_id);
        const slotsCount = inMemoryStore.slots.filter(s => s.centre_id === c.id).length;
        const qCount = inMemoryStore.bookings.filter(b => b.centre_id === c.id && ['CHECKED_IN', 'CALLED', 'QUALITY_INSPECTION', 'WEIGHING', 'UNLOADING'].includes(b.status)).length;
        return {
          ...c,
          supported_crops: typeof c.supported_crops === 'string' ? JSON.parse(c.supported_crops) : c.supported_crops,
          manager_name: mgr ? mgr.full_name : 'Rajesh Sharma (Supervisor)',
          manager_phone: mgr ? mgr.phone : '9876543220',
          active_slots_count: slotsCount,
          active_queue_count: qCount,
        };
      });
    }

    return res.json({
      success: true,
      count: centres.length,
      centres,
    });
  } catch (error) {
    console.error('Admin Fetch Centres Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch Mandi centres.' });
  }
});

// 9. POST /api/admin/centres - Create new Mandi Centre with auto slot generation
router.post('/centres', async (req, res) => {
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
      manager_id,
    } = req.body;

    if (!name || !state || !district || !address) {
      return res.status(400).json({ success: false, message: 'Name, state, district, and address are required.' });
    }

    const cleanCode = code ? code.trim().toUpperCase() : `MND-${district.trim().slice(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;

    const centreId = `ctr_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
    const cropsArr = supported_crops && Array.isArray(supported_crops) && supported_crops.length > 0
      ? supported_crops
      : ['Wheat', 'Paddy', 'Mustard', 'Gram', 'Maize', 'Soybean'];
    const capacityQtl = parseInt(daily_capacity_quintals || '8000', 10);
    const trucksCount = parseInt(max_concurrent_trucks || '16', 10);
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
      manager_id: manager_id || null,
      created_at: new Date().toISOString(),
    };

    if (!isUsingMockStore && pool) {
      await pool.query(`
        INSERT INTO centres (id, name, code, state, district, address, latitude, longitude, daily_capacity_quintals, max_concurrent_trucks, supported_crops, contact_phone, operating_hours, is_active, manager_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, $14)
      `, [newCentre.id, newCentre.name, newCentre.code, newCentre.state, newCentre.district, newCentre.address, newCentre.latitude, newCentre.longitude, newCentre.daily_capacity_quintals, newCentre.max_concurrent_trucks, JSON.stringify(newCentre.supported_crops), newCentre.contact_phone, newCentre.operating_hours, newCentre.manager_id]);

      // Provision initial 7-day slot windows
      const windows = [
        { start: '08:00', end: '10:00', cap: 1500 },
        { start: '10:00', end: '12:00', cap: 1800 },
        { start: '12:00', end: '14:00', cap: 1500 },
        { start: '14:00', end: '16:00', cap: 1500 },
        { start: '16:00', end: '18:00', cap: 1200 },
      ];

      for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
        const d = new Date();
        d.setDate(d.getDate() + dayOffset);
        const dateStr = d.toISOString().split('T')[0];

        for (const w of windows) {
          const slotId = `slt_${newCentre.code.toLowerCase()}_${dateStr}_${w.start.replace(/:/g, '')}`;
          await pool.query(`
            INSERT INTO slots (id, centre_id, slot_date, start_time, end_time, max_capacity_quintals, booked_capacity_quintals, max_tokens, booked_tokens, status)
            VALUES ($1, $2, $3, $4, $5, $6, 0, 25, 0, 'OPEN')
            ON CONFLICT (centre_id, slot_date, start_time, end_time) DO NOTHING
          `, [slotId, newCentre.id, dateStr, w.start, w.end, w.cap]);
        }
      }
    }

    inMemoryStore.centres.push(newCentre);

    // Also populate in-memory slots for fallback
    const timeSlots = [
      { start: '08:00', end: '10:00' },
      { start: '10:00', end: '12:00' },
      { start: '12:00', end: '14:00' },
      { start: '14:00', end: '16:00' },
      { start: '16:00', end: '18:00' },
    ];
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const d = new Date();
      d.setDate(d.getDate() + dayOffset);
      const dateStr = d.toISOString().split('T')[0];
      timeSlots.forEach((ts, idx) => {
        inMemoryStore.slots.push({
          id: `slt_${newCentre.id}_${dateStr}_${idx + 1}`,
          centre_id: newCentre.id,
          slot_date: dateStr,
          start_time: ts.start,
          end_time: ts.end,
          max_capacity_quintals: 1500,
          booked_capacity_quintals: 0,
          max_tokens: 25,
          booked_tokens: 0,
          status: 'OPEN',
          created_at: new Date().toISOString(),
        });
      });
    }

    return res.status(201).json({
      success: true,
      message: `Mandi Hub "${newCentre.name}" created successfully with 7-day slot windows.`,
      centre: newCentre,
    });
  } catch (error) {
    console.error('Admin Create Centre Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create Mandi centre.' });
  }
});

// 10. PUT /api/admin/centres/:id - Edit Mandi Centre & toggle active status
router.put('/centres/:id', async (req, res) => {
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
      manager_id,
    } = req.body;

    let centre = null;
    if (!isUsingMockStore && pool) {
      const cRes = await pool.query('SELECT * FROM centres WHERE id = $1', [id]);
      if (cRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Centre not found.' });
      centre = cRes.rows[0];

      await pool.query(`
        UPDATE centres
        SET name = COALESCE($1, name),
            address = COALESCE($2, address),
            state = COALESCE($3, state),
            district = COALESCE($4, district),
            daily_capacity_quintals = COALESCE($5, daily_capacity_quintals),
            max_concurrent_trucks = COALESCE($6, max_concurrent_trucks),
            supported_crops = COALESCE($7, supported_crops),
            contact_phone = COALESCE($8, contact_phone),
            operating_hours = COALESCE($9, operating_hours),
            is_active = COALESCE($10, is_active),
            manager_id = COALESCE($11, manager_id)
        WHERE id = $12
      `, [
        name,
        address,
        state,
        district,
        daily_capacity_quintals ? parseInt(daily_capacity_quintals, 10) : null,
        max_concurrent_trucks ? parseInt(max_concurrent_trucks, 10) : null,
        supported_crops ? JSON.stringify(supported_crops) : null,
        contact_phone,
        operating_hours,
        is_active !== undefined ? is_active : null,
        manager_id,
        id,
      ]);

      const updatedRes = await pool.query('SELECT * FROM centres WHERE id = $1', [id]);
      centre = updatedRes.rows[0];
    } else {
      centre = inMemoryStore.centres.find(c => c.id === id);
      if (!centre) return res.status(404).json({ success: false, message: 'Centre not found.' });

      if (name !== undefined) centre.name = name;
      if (address !== undefined) centre.address = address;
      if (state !== undefined) centre.state = state;
      if (district !== undefined) centre.district = district;
      if (daily_capacity_quintals !== undefined) centre.daily_capacity_quintals = parseInt(daily_capacity_quintals, 10);
      if (max_concurrent_trucks !== undefined) centre.max_concurrent_trucks = parseInt(max_concurrent_trucks, 10);
      if (supported_crops !== undefined) centre.supported_crops = supported_crops;
      if (contact_phone !== undefined) centre.contact_phone = contact_phone;
      if (operating_hours !== undefined) centre.operating_hours = operating_hours;
      if (is_active !== undefined) centre.is_active = Boolean(is_active);
      if (manager_id !== undefined) centre.manager_id = manager_id;
    }

    return res.json({
      success: true,
      message: `Mandi "${centre.name}" updated successfully.`,
      centre,
    });
  } catch (error) {
    console.error('Admin Update Centre Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update Mandi centre.' });
  }
});

// 11. GET /api/admin/slots/:centreId - View slots for a centre
router.get('/slots/:centreId', async (req, res) => {
  try {
    const { centreId } = req.params;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    let slots = [];

    if (!isUsingMockStore && pool) {
      const sRes = await pool.query(`
        SELECT * FROM slots 
        WHERE centre_id = $1 AND slot_date = $2 
        ORDER BY start_time ASC
      `, [centreId, targetDate]);
      slots = sRes.rows;
    } else {
      slots = inMemoryStore.slots.filter(s => s.centre_id === centreId && s.slot_date === targetDate);
    }

    return res.json({
      success: true,
      centre_id: centreId,
      date: targetDate,
      slots,
    });
  } catch (error) {
    console.error('Admin Fetch Slots Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve slots.' });
  }
});

// 12. PUT /api/admin/slots/:slotId - Update slot capacity / status
router.put('/slots/:slotId', async (req, res) => {
  try {
    const { slotId } = req.params;
    const { max_capacity_quintals, max_tokens, status } = req.body;

    let slot = null;
    if (!isUsingMockStore && pool) {
      await pool.query(`
        UPDATE slots
        SET max_capacity_quintals = COALESCE($1, max_capacity_quintals),
            max_tokens = COALESCE($2, max_tokens),
            status = COALESCE($3, status)
        WHERE id = $4
      `, [max_capacity_quintals ? parseInt(max_capacity_quintals, 10) : null, max_tokens ? parseInt(max_tokens, 10) : null, status, slotId]);

      const updatedRes = await pool.query('SELECT * FROM slots WHERE id = $1', [slotId]);
      slot = updatedRes.rows[0];
    } else {
      slot = inMemoryStore.slots.find(s => s.id === slotId);
      if (!slot) return res.status(404).json({ success: false, message: 'Slot not found.' });

      if (max_capacity_quintals !== undefined) slot.max_capacity_quintals = parseInt(max_capacity_quintals, 10);
      if (max_tokens !== undefined) slot.max_tokens = parseInt(max_tokens, 10);
      if (status !== undefined) slot.status = status;
    }

    return res.json({
      success: true,
      message: 'Slot settings updated successfully.',
      slot,
    });
  } catch (error) {
    console.error('Admin Update Slot Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update slot.' });
  }
});

// 13. GET /api/admin/audit-logs - System audit trail
router.get('/audit-logs', async (req, res) => {
  try {
    let logs = [];
    if (!isUsingMockStore && pool) {
      const lRes = await pool.query(`
        SELECT q.*, b.token_number, b.crop_name, b.vehicle_number, c.name as centre_name
        FROM queue_audit_logs q
        LEFT JOIN bookings b ON q.booking_id = b.id
        LEFT JOIN centres c ON b.centre_id = c.id
        ORDER BY q.timestamp DESC
        LIMIT 50
      `);
      logs = lRes.rows;
    } else {
      logs = [...inMemoryStore.queue_audit_logs].slice(-50).reverse().map(l => {
        const b = inMemoryStore.bookings.find(x => x.id === l.booking_id);
        const c = b ? inMemoryStore.centres.find(x => x.id === b.centre_id) : null;
        return {
          ...l,
          token_number: b?.token_number || 'N/A',
          crop_name: b?.crop_name || 'Grain',
          vehicle_number: b?.vehicle_number || 'N/A',
          centre_name: c?.name || 'Mandi Yard',
        };
      });
    }

    return res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error('Admin Fetch Logs Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
});

export default router;
