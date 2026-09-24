import express from 'express';
import { inMemoryStore, isUsingMockStore, pool } from '../db/index.js';
import {
  calculateCostMatrix,
  calculateTimeMatrix,
  generateRecommendationExplanation,
} from '../config/costConfig.js';

const router = express.Router();

// Handler for Smart Slot & Mandi Recommendation (supports Cost & Time Matrix)
async function handleSlotRecommendation(req, res) {
  try {
    const {
      crop_name,
      quantity_quintals,
      preferred_date,
      vehicle_type = 'Tractor Trolley',
      distance_km,
    } = req.body || {};

    const targetDate = preferred_date || new Date().toISOString().split('T')[0];

    let centresList = [];

    if (!isUsingMockStore && pool) {
      const cRes = await pool.query('SELECT * FROM centres WHERE is_active = TRUE');
      centresList = cRes.rows;
    } else {
      centresList = [...inMemoryStore.centres];
    }

    const recommendations = await Promise.all(
      centresList.map(async (centre) => {
        let queueCongestion = 0;
        let bestSlot = null;

        if (!isUsingMockStore && pool) {
          const qCountRes = await pool.query(
            `SELECT COUNT(*) as active_count FROM bookings
             WHERE centre_id = $1 AND status IN ('CHECKED_IN', 'CALLED', 'QUALITY_INSPECTION', 'WEIGHING', 'UNLOADING')`,
            [centre.id]
          );
          queueCongestion = parseInt(qCountRes.rows[0]?.active_count || '0', 10);

          const slotsRes = await pool.query(
            `SELECT * FROM slots
             WHERE centre_id = $1 AND slot_date = $2 AND status = 'OPEN'
             ORDER BY (booked_tokens::float / NULLIF(max_tokens, 0)) ASC LIMIT 1`,
            [centre.id, targetDate]
          );
          if (slotsRes.rows.length > 0) bestSlot = slotsRes.rows[0];
        } else {
          const activeQueue = inMemoryStore.bookings.filter(
            b => b.centre_id === centre.id && ['CHECKED_IN', 'CALLED', 'QUALITY_INSPECTION', 'WEIGHING', 'UNLOADING'].includes(b.status)
          );
          queueCongestion = activeQueue.length;
          const slots = inMemoryStore.slots.filter(
            s => s.centre_id === centre.id && s.slot_date === targetDate && s.status === 'OPEN'
          );
          bestSlot = [...slots].sort((a, b) => (a.booked_tokens / a.max_tokens) - (b.booked_tokens / b.max_tokens))[0] || null;
        }

        // 1. Time Matrix Calculation (Vehicle handling + Queue wait + Gate clearance)
        const timeMatrix = calculateTimeMatrix({
          vehicleType: vehicle_type,
          queueCongestion,
        });

        // 2. Cost Matrix Calculation (Vehicle mobilization + Freight + Mandi handling charges)
        const costMatrix = calculateCostMatrix({
          vehicleType: vehicle_type,
          distanceKm: distance_km,
          quantityQuintals: quantity_quintals,
        });

        // 3. Recommendation Scoring (Preserving congestion/capacity dominance with subtle turnaround bonus/penalty)
        const congestionPenalty = Math.min(50, queueCongestion * 5);
        const capacityBonus = parseInt(centre.daily_capacity_quintals || '5000', 10) > 7000 ? 15 : 5;
        let score = 85 - congestionPenalty + capacityBonus;

        // Modest score adjustment based on turnaround efficiency and cost (< 10% weight)
        if (timeMatrix.estimatedTotalMinutes <= 30) {
          score += 5;
        } else if (timeMatrix.estimatedTotalMinutes >= 60) {
          score -= 5;
        }

        score = Math.max(10, Math.min(99, Math.round(score)));

        // 4. Explainable justification
        const explanation = generateRecommendationExplanation({
          queueCongestion,
          estimatedWaitMinutes: timeMatrix.estimatedWaitMinutes,
          estimatedProcessingMinutes: timeMatrix.estimatedProcessingMinutes,
          estimatedTotalMinutes: timeMatrix.estimatedTotalMinutes,
          estimatedTotalCost: costMatrix.estimatedTotalCost,
          vehicleType: costMatrix.vehicleType,
          score,
        });

        const occPct = bestSlot ? Math.round((parseInt(bestSlot.booked_tokens || '0', 10) / parseInt(bestSlot.max_tokens || '25', 10)) * 100) : 0;

        return {
          centre_id: centre.id,
          centre_name: centre.name,
          centre_code: centre.code,
          district: centre.district,
          state: centre.state,
          recommended_slot: bestSlot ? {
            id: bestSlot.id,
            date: bestSlot.slot_date,
            time: `${bestSlot.start_time} - ${bestSlot.end_time}`,
            occupancy_percentage: occPct,
            congestion_color: occPct > 70 ? 'YELLOW' : 'GREEN',
            estimatedCost: costMatrix.estimatedTotalCost,
            estimatedTransportCost: costMatrix.estimatedTransportCost,
            estimatedMandiCost: costMatrix.estimatedMandiCost,
            estimatedWaitMinutes: timeMatrix.estimatedWaitMinutes,
            estimatedProcessingMinutes: timeMatrix.estimatedProcessingMinutes,
            estimatedTotalMinutes: timeMatrix.estimatedTotalMinutes,
            human_readable: {
              wait_text: timeMatrix.estimatedWaitText,
              processing_text: timeMatrix.estimatedProcessingText,
              total_text: timeMatrix.estimatedTotalText,
              cost_text: costMatrix.totalCostFormatted,
            },
          } : null,
          congestion_level: queueCongestion > 8 ? 'HIGH' : queueCongestion > 4 ? 'MODERATE' : 'LOW',
          active_trucks_in_queue: queueCongestion,
          estimated_wait_time_minutes: timeMatrix.estimatedWaitMinutes,
          recommendation_score: score,
          ai_tag: score >= 80 ? '⭐ Best Match (Fastest Turnaround)' : score >= 65 ? '👍 Recommended' : '⚠️ Heavy Rush Expected',

          // Cost Matrix Outputs (both camelCase and snake_case for universal compatibility)
          estimatedCost: costMatrix.estimatedTotalCost,
          estimatedTransportCost: costMatrix.estimatedTransportCost,
          estimatedMandiCost: costMatrix.estimatedMandiCost,
          estimated_cost: costMatrix.estimatedTotalCost,
          estimated_transport_cost: costMatrix.estimatedTransportCost,
          estimated_mandi_cost: costMatrix.estimatedMandiCost,

          // Time Matrix Outputs
          estimatedWaitMinutes: timeMatrix.estimatedWaitMinutes,
          estimatedProcessingMinutes: timeMatrix.estimatedProcessingMinutes,
          estimatedTotalMinutes: timeMatrix.estimatedTotalMinutes,
          estimated_wait_minutes: timeMatrix.estimatedWaitMinutes,
          estimated_processing_minutes: timeMatrix.estimatedProcessingMinutes,
          estimated_total_minutes: timeMatrix.estimatedTotalMinutes,

          // Formatted human-readable summaries
          human_readable: {
            wait_text: timeMatrix.estimatedWaitText,
            processing_text: timeMatrix.estimatedProcessingText,
            total_text: timeMatrix.estimatedTotalText,
            cost_text: costMatrix.totalCostFormatted,
          },

          // Detailed breakdowns & assumptions
          cost_breakdown: costMatrix,
          time_breakdown: timeMatrix,

          // AI-assisted explainability
          ai_explanation: explanation,
          explanation: explanation,
        };
      })
    );

    recommendations.sort((a, b) => b.recommendation_score - a.recommendation_score);

    return res.json({
      success: true,
      target_date: targetDate,
      recommendations,
    });
  } catch (error) {
    console.error('AI Recommendation Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to compute slot recommendations.' });
  }
}

// Support both /recommend-slot and /recommend
router.post('/recommend-slot', handleSlotRecommendation);
router.post('/recommend', handleSlotRecommendation);

// 2. Dynamic Wait Time Prediction Engine
router.get('/predict-wait-time/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    let booking = null;
    let vehiclesAheadCount = 0;

    if (!isUsingMockStore && pool) {
      const bRes = await pool.query('SELECT * FROM bookings WHERE id = $1 OR token_number = $1', [bookingId]);
      if (bRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }
      booking = bRes.rows[0];

      if (booking.status === 'PROCURED') {
        return res.json({
          success: true,
          status: 'COMPLETED',
          estimated_remaining_minutes: 0,
          message: 'Procurement complete. Receipt generated.',
        });
      }

      const countRes = await pool.query(
        `SELECT COUNT(*) as count FROM bookings
         WHERE centre_id = $1
           AND status IN ('CHECKED_IN', 'CALLED', 'QUALITY_INSPECTION', 'WEIGHING', 'UNLOADING')
           AND created_at < $2`,
        [booking.centre_id, booking.created_at]
      );
      vehiclesAheadCount = parseInt(countRes.rows[0]?.count || '0', 10);
    } else {
      booking = inMemoryStore.bookings.find(b => b.id === bookingId || b.token_number === bookingId);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }
      if (booking.status === 'PROCURED') {
        return res.json({
          success: true,
          status: 'COMPLETED',
          estimated_remaining_minutes: 0,
          message: 'Procurement complete. Receipt generated.',
        });
      }
      const activeAhead = inMemoryStore.bookings.filter(
        b => b.centre_id === booking.centre_id &&
             ['CHECKED_IN', 'CALLED', 'QUALITY_INSPECTION', 'WEIGHING', 'UNLOADING'].includes(b.status) &&
             new Date(b.created_at) < new Date(booking.created_at)
      );
      vehiclesAheadCount = activeAhead.length;
    }

    const stageTimeMultiplier = {
      'Tractor Trolley': 12,
      'Mini Truck (Tata 407)': 15,
      'Heavy Truck': 22,
      'Bullock Cart': 10,
    };

    const multiplier = stageTimeMultiplier[booking.vehicle_type] || 12;
    const baseWait = vehiclesAheadCount * multiplier;

    let currentStageRemaining = 10;
    if (booking.status === 'QUALITY_INSPECTION') currentStageRemaining = 6;
    if (booking.status === 'WEIGHING') currentStageRemaining = 8;
    if (booking.status === 'UNLOADING') currentStageRemaining = 4;

    const totalEstimateMins = Math.max(3, baseWait + currentStageRemaining);

    return res.json({
      success: true,
      token_number: booking.token_number,
      current_status: booking.status,
      vehicles_ahead_count: vehiclesAheadCount,
      estimated_wait_minutes: totalEstimateMins,
      confidence_interval: `± 4 mins`,
      advice: totalEstimateMins > 45
        ? 'Heavy rush at weighbridge. You may rest in the Kisan Shed.'
        : 'Please remain near your vehicle; you will be called shortly.',
    });
  } catch (error) {
    console.error('Wait Time Predictor Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to predict wait time.' });
  }
});

// 3. Multilingual Chat & Voice Assistant
router.post('/chat-assistant', async (req, res) => {
  try {
    const { query: userQuery, language = 'hi', token_number } = req.body;

    if (!userQuery) {
      return res.status(400).json({ success: false, message: 'Query text is required.' });
    }

    const qLower = userQuery.toLowerCase();
    let reply = '';
    let action = null;

    // Check for token inquiry
    if (qLower.includes('token') || qLower.includes('number') || qLower.includes('status') || qLower.includes('kab')) {
      let sampleBooking = null;

      if (!isUsingMockStore && pool) {
        if (token_number) {
          const bRes = await pool.query('SELECT * FROM bookings WHERE token_number ILIKE $1 LIMIT 1', [`%${token_number}%`]);
          if (bRes.rows.length > 0) sampleBooking = bRes.rows[0];
        } else {
          const firstRes = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 1');
          if (firstRes.rows.length > 0) sampleBooking = firstRes.rows[0];
        }
      } else {
        sampleBooking = token_number
          ? inMemoryStore.bookings.find(b => b.token_number.toLowerCase().includes(token_number.toLowerCase()))
          : inMemoryStore.bookings[0];
      }

      if (sampleBooking) {
        if (language === 'hi') {
          reply = `नमस्ते! आपका टोकन नंबर ${sampleBooking.token_number} वर्तमान में "${sampleBooking.status}" स्थिति में है। अनुमानित प्रतीक्षा समय लगभग 15-20 मिनट है। कृपया गेट और लाउडस्पीकर की घोषणाओं पर ध्यान दें।`;
        } else if (language === 'pb') {
          reply = `ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ! ਤੁਹਾਡਾ ਟੋਕਨ ਨੰਬਰ ${sampleBooking.token_number} ਹੁਣ "${sampleBooking.status}" ਵਿੱਚ ਹੈ। ਲਗਭਗ 15-20 ਮਿੰਟ ਹੋਰ ਲੱਗਣਗੇ।`;
        } else {
          reply = `Hello! Your token #${sampleBooking.token_number} is currently in "${sampleBooking.status}" stage. Estimated wait time is approx 15-20 minutes. Please stay near the vehicle parking bay.`;
        }
        action = { type: 'VIEW_TOKEN', token_number: sampleBooking.token_number };
      }
    } else if (qLower.includes('msp') || qLower.includes('rate') || qLower.includes('bhav') || qLower.includes('keemat')) {
      if (language === 'hi') {
        reply = `वर्तमान सरकारी एमएसपी (MSP) दरें: \n• गेहूं (Wheat): ₹2,275 प्रति क्विंटल \n• धान (Basmati): ₹4,200 प्रति क्विंटल \n• सरसों (Mustard): ₹5,650 प्रति क्विंटल \n• चना (Gram): ₹5,440 प्रति क्विंटल। भुगतान सीधा आपके DBT बैंक खाते में 48 घंटे में किया जाता है।`;
      } else if (language === 'pb') {
        reply = `ਸਰਕਾਰੀ ਐਮਐਸਪੀ (MSP) ਰੇਟ: \n• ਕਣਕ: ₹2,275 ਪ੍ਰਤੀ ਕੁਇੰਟਲ \n• ਬਾਸਮਤੀ ਝੋਨਾ: ₹4,200 ਪ੍ਰਤੀ ਕੁਇੰਟਲ \n• ਸਰ੍ਹੋਂ: ₹5,650 ਪ੍ਰਤੀ ਕੁਇੰਟਲ। ਰਕਮ ਸਿੱਧੇ ਤੁਹਾਡੇ ਬੈਂਕ ਖਾਤੇ ਵਿੱਚ ਜਮ੍ਹਾਂ ਹੁੰਦੀ ਹੈ।`;
      } else {
        reply = `Current Government MSP Rates: \n• Wheat: ₹2,275/Qtl \n• Paddy (Basmati): ₹4,200/Qtl \n• Mustard: ₹5,650/Qtl \n• Gram: ₹5,440/Qtl. Payments are transferred directly via DBT to your verified bank account.`;
      }
      action = { type: 'VIEW_MSP' };
    } else if (qLower.includes('slot') || qLower.includes('book') || qLower.includes('booking') || qLower.includes('samay')) {
      if (language === 'hi') {
        reply = `नया स्लॉट बुक करने के लिए "Book Slot" बटन पर क्लिक करें। फसल का प्रकार, मात्रा और पसंदीदा तारीख चुनें। एआई सिस्टम आपको सबसे कम भीड़ वाला समय स्लॉट सुझाएगा।`;
      } else {
        reply = `To book a slot, click the "Book Slot" button on the home screen. Select your crop type, estimated quantity, and preferred time slot.`;
      }
      action = { type: 'NAVIGATE_BOOKING' };
    } else {
      if (language === 'hi') {
        reply = `मैं आपका किसान सेतु एआई सहायक हूँ। आप मुझसे मंडी स्लॉट बुकिंग, लाइव टोकन स्थिति, क्वालिटी जांच नियम या एमएसपी दरों के बारे में पूछ सकते हैं।`;
      } else {
        reply = `I am your KisanSetu AI Assistant. You can ask me about slot booking, token queue status, quality moisture limits, or MSP procurement rates.`;
      }
    }

    return res.json({
      success: true,
      query: userQuery,
      language,
      response: reply,
      action,
    });
  } catch (error) {
    console.error('Chat Assistant Error:', error);
    return res.status(500).json({ success: false, message: 'AI Assistant temporary error.' });
  }
});

export default router;
