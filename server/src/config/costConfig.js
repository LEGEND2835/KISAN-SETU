/**
 * KisanSetu — Centralized Cost Matrix & Time Matrix Configuration
 * ================================================================
 *
 * IMPORTANT ARCHITECTURAL NOTE:
 * The transportation rates, Mandi procurement charges, and handling times
 * defined in this module are CONFIGURABLE ASSUMPTIONS designed for the
 * AI-assisted intelligent slot recommendation engine.
 *
 * DO NOT claim that these rates are official statutory Mandi rates or
 * Government-notified freight tariffs. These parameters will be calibrated
 * and validated during the physical Mandi field visits and updated accordingly.
 */

// ==========================================
// 1. VEHICLE TRANSPORTATION COST ASSUMPTIONS
// ==========================================
export const VEHICLE_TRANSPORT_CONFIG = {
  // Heavy multi-axle trucks (high payload, higher base mobilization + fuel rate)
  'Heavy Truck': {
    label: 'Heavy Truck',
    baseMobilizationCost: 500, // INR fixed base charge
    perKmRate: 35,             // INR per km freight rate
    capacityQuintals: 300,
  },
  // Tractor trolley (standard farm haulage in northern & central India)
  'Tractor Trolley': {
    label: 'Tractor Trolley',
    baseMobilizationCost: 300, // INR fixed base charge
    perKmRate: 25,             // INR per km freight rate
    capacityQuintals: 100,
  },
  // Light commercial vehicle (Tata Ace / 407 / Pickup)
  'Mini Truck (Tata Ace/407)': {
    label: 'Mini Truck (Tata Ace/407)',
    baseMobilizationCost: 250, // INR fixed base charge
    perKmRate: 20,             // INR per km freight rate
    capacityQuintals: 70,
  },
  // Non-motorized / traditional farm cart
  'Bullock Cart': {
    label: 'Bullock Cart',
    baseMobilizationCost: 100, // INR fixed base charge
    perKmRate: 12,             // INR per km freight rate
    capacityQuintals: 30,
  },
  // Default fallback for unspecified or custom vehicle types
  'Other': {
    label: 'Standard Vehicle',
    baseMobilizationCost: 250,
    perKmRate: 22,
    capacityQuintals: 80,
  },
};

// ==========================================
// 2. MANDI / PROCUREMENT FEE ASSUMPTIONS
// ==========================================
/**
 * Mandi procurement, handling, and weighing cess.
 * Note: Kept conceptually separate from transportation costs.
 */
export const MANDI_PROCUREMENT_CONFIG = {
  // Configurable Mandi handling + weighing + administrative cess per quintal
  ratePerQuintal: 6.0, // INR per quintal (e.g. ₹4 weighing/cess + ₹2 Mandi yard handling)
  minimumFee: 50,      // INR minimum administrative processing fee floor
  isConfigurableAssumption: true,
  note: 'Configurable assumption pending official APMC schedule calibration during Mandi visit',
};

// ==========================================
// 3. LOGISTICS DISTANCE ASSUMPTIONS
// ==========================================
/**
 * Default travel distance assumption when farmer GPS/GIS route coordinates
 * are not yet available. Isolated so it can be swapped with live map routing later.
 */
export const DEFAULT_DISTANCE_CONFIG = {
  defaultDistanceKm: 15, // Standard radius assumption from farm to local block Mandi
  minDistanceKm: 3,
  maxDistanceKm: 80,
};

// ==========================================
// 4. TIME MATRIX CONFIGURATION
// ==========================================
/**
 * Heuristic turnaround time parameters per vehicle category and Mandi station.
 */
export const TIME_MATRIX_CONFIG = {
  // Vehicle-specific unloading & weighbridge handling duration (minutes)
  vehicleProcessingMinutes: {
    'Heavy Truck': 25,                 // Higher payload unloading time at platform
    'Tractor Trolley': 18,             // Standard hydraulic tipping / manual assist
    'Mini Truck (Tata Ace/407)': 14,   // Fast tailgate unloading
    'Bullock Cart': 12,                // Small quantity manual offloading
    'Other': 15,                       // Fallback estimate
  },
  // Active queue throughput wait per ahead vehicle in queue (minutes)
  waitMinutesPerTruckInQueue: 12,
  // Baseline gate verification & security slip clearance (minutes)
  gateClearanceMinutes: 5,
};

// ==========================================
// 5. HELPER FUNCTIONS
// ==========================================

/**
 * Normalizes any freeform or UI vehicle type string to our standard config keys.
 * Handles variations like "truck", "tempo", "tractor", etc.
 */
export function normalizeVehicleType(vehicleType) {
  if (!vehicleType || typeof vehicleType !== 'string') {
    return 'Tractor Trolley'; // Standard default in agricultural grain mandis
  }

  const vt = vehicleType.toLowerCase().trim();

  if (vt.includes('heavy') || vt === 'truck') {
    return 'Heavy Truck';
  }
  if (vt.includes('mini') || vt.includes('ace') || vt.includes('407') || vt.includes('tempo')) {
    return 'Mini Truck (Tata Ace/407)';
  }
  if (vt.includes('tractor') || vt.includes('trolley')) {
    return 'Tractor Trolley';
  }
  if (vt.includes('bullock') || vt.includes('cart') || vt.includes('bail')) {
    return 'Bullock Cart';
  }

  return 'Other';
}

/**
 * Computes the estimated Cost Matrix for a given booking or slot recommendation.
 *
 * Formula:
 * estimatedTransportCost = baseMobilizationCost + (distanceKm * perKmRate)
 * estimatedMandiCost     = Math.max(minimumFee, quantityQuintals * ratePerQuintal)
 * estimatedTotalCost     = estimatedTransportCost + estimatedMandiCost
 *
 * @param {Object} params
 * @param {string} params.vehicleType - Selected or inferred vehicle type
 * @param {number} [params.distanceKm] - Distance in km (falls back to default assumption)
 * @param {number} [params.quantityQuintals] - Quantity to transport in quintals
 * @returns {Object} Cost matrix breakdown with formatted values and assumption metadata
 */
export function calculateCostMatrix({ vehicleType, distanceKm, quantityQuintals }) {
  const normalizedType = normalizeVehicleType(vehicleType);
  const vehicleConfig = VEHICLE_TRANSPORT_CONFIG[normalizedType] || VEHICLE_TRANSPORT_CONFIG['Other'];

  const dist = Number.isFinite(Number(distanceKm)) && Number(distanceKm) > 0
    ? Math.min(Math.max(Number(distanceKm), DEFAULT_DISTANCE_CONFIG.minDistanceKm), DEFAULT_DISTANCE_CONFIG.maxDistanceKm)
    : DEFAULT_DISTANCE_CONFIG.defaultDistanceKm;

  const qty = Number.isFinite(Number(quantityQuintals)) && Number(quantityQuintals) > 0
    ? Number(quantityQuintals)
    : 50; // Sensible 50 Qtl average harvest consignment

  // 1. Transport Cost = Mobilization Base + (Distance * Rate)
  const transportCost = Math.round(vehicleConfig.baseMobilizationCost + (dist * vehicleConfig.perKmRate));

  // 2. Mandi / Procurement Charges = Qty * Rate per Quintal (with minimum fee floor)
  const mandiCost = Math.round(Math.max(MANDI_PROCUREMENT_CONFIG.minimumFee, qty * MANDI_PROCUREMENT_CONFIG.ratePerQuintal));

  // 3. Total Estimated Cost
  const totalCost = transportCost + mandiCost;

  return {
    vehicleType: normalizedType,
    distanceKm: dist,
    estimatedTransportCost: transportCost,
    estimatedMandiCost: mandiCost,
    estimatedTotalCost: totalCost,
    // Formatted rupee strings
    transportCostFormatted: `₹${transportCost.toLocaleString('en-IN')}`,
    mandiCostFormatted: `₹${mandiCost.toLocaleString('en-IN')}`,
    totalCostFormatted: `₹${totalCost.toLocaleString('en-IN')}`,
    // Configuration & assumption metadata
    ratePerKm: vehicleConfig.perKmRate,
    baseMobilizationCost: vehicleConfig.baseMobilizationCost,
    mandiRatePerQuintal: MANDI_PROCUREMENT_CONFIG.ratePerQuintal,
    isConfigurableAssumption: true,
    disclaimer: 'Transportation rates and Mandi fees are configurable assumptions pending validation during physical Mandi visit.',
  };
}

/**
 * Computes the estimated Time Matrix for a given queue state and vehicle type.
 *
 * Formula:
 * queueWaitMinutes          = (queueCongestion * waitMinutesPerTruckInQueue) + gateClearanceMinutes
 * estimatedProcessingMinutes = vehicleProcessingMinutes[vehicleType]
 * estimatedTotalMinutes      = queueWaitMinutes + estimatedProcessingMinutes
 *
 * @param {Object} params
 * @param {string} params.vehicleType - Selected vehicle type
 * @param {number} params.queueCongestion - Number of active vehicles currently ahead in queue
 * @returns {Object} Time matrix breakdown with human-readable estimates
 */
export function calculateTimeMatrix({ vehicleType, queueCongestion = 0 }) {
  const normalizedType = normalizeVehicleType(vehicleType);
  const processingMinutes = TIME_MATRIX_CONFIG.vehicleProcessingMinutes[normalizedType]
    || TIME_MATRIX_CONFIG.vehicleProcessingMinutes['Other'];

  const congestionCount = Math.max(0, parseInt(queueCongestion || 0, 10));

  // Base gate clearance is always 5 mins, plus 12 mins per queued truck
  const waitMinutes = congestionCount > 0
    ? Math.round(congestionCount * TIME_MATRIX_CONFIG.waitMinutesPerTruckInQueue + TIME_MATRIX_CONFIG.gateClearanceMinutes)
    : TIME_MATRIX_CONFIG.gateClearanceMinutes;

  const totalMinutes = waitMinutes + processingMinutes;

  return {
    vehicleType: normalizedType,
    activeTrucksInQueue: congestionCount,
    estimatedWaitMinutes: waitMinutes,
    estimatedProcessingMinutes: processingMinutes,
    estimatedTotalMinutes: totalMinutes,
    gateClearanceMinutes: TIME_MATRIX_CONFIG.gateClearanceMinutes,
    // Rounded human-readable display strings as requested
    estimatedWaitText: `~${waitMinutes} min wait`,
    estimatedProcessingText: `~${processingMinutes} min processing`,
    estimatedTotalText: `~${totalMinutes} min total`,
    isConfigurableAssumption: true,
    disclaimer: 'Processing times are heuristic estimates based on vehicle throughput, subject to calibration during Mandi visits.',
  };
}

/**
 * Generates an explainable AI justification string based on congestion, vehicle speed, and logistics cost.
 */
export function generateRecommendationExplanation({
  queueCongestion,
  estimatedWaitMinutes,
  estimatedProcessingMinutes,
  estimatedTotalMinutes,
  estimatedTotalCost,
  vehicleType,
  score,
}) {
  const parts = [];

  if (queueCongestion <= 2) {
    parts.push('minimal queue congestion');
  } else if (queueCongestion <= 6) {
    parts.push('moderate queue volume');
  } else {
    parts.push('high intake rush');
  }

  parts.push(`fast ~${estimatedProcessingMinutes} min ${vehicleType} handling`);

  if (estimatedTotalMinutes <= 35) {
    parts.push(`rapid ~${estimatedTotalMinutes} min total turnaround`);
  } else {
    parts.push(`~${estimatedTotalMinutes} min expected turnaround`);
  }

  parts.push(`economical ₹${estimatedTotalCost.toLocaleString('en-IN')} total cost estimate`);

  if (score >= 80) {
    return `AI Recommended: Optimal choice due to ${parts[0]}, ${parts[1]}, and ${parts[3]}.`;
  } else if (score >= 65) {
    return `Suitable Alternative: ${parts[0]} with ${parts[2]}.`;
  } else {
    return `Heavy rush expected: ${parts[0]} (${queueCongestion} vehicles). Consider alternative morning slot or nearby Mandi.`;
  }
}
