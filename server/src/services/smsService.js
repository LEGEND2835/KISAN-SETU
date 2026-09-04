import dotenv from 'dotenv';
dotenv.config();

/**
 * Clean and normalize phone number for Indian SMS gateways (e.g. Fast2SMS / 10-digit mobile number)
 * Accepts standard 10-digit Indian numbers, with or without +91, 91, or 0 prefix.
 * @param {string} rawPhone 
 * @returns {string|null} 10-digit mobile number string (e.g. "9876543210"), or null if invalid
 */
export function normalizeIndianPhoneNumber(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return null;

  // Strip all non-digit characters
  const digits = rawPhone.replace(/\D/g, '');

  // Case 1: Standard 10-digit Indian mobile number starting with 6, 7, 8, or 9
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }

  // Case 2: 12-digit number with 91 country code (e.g. 919876543210)
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
    return digits.slice(2);
  }

  // Case 3: 11-digit number with leading 0 (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) {
    return digits.slice(1);
  }

  // Fallback: If 10-15 digits and ends with a valid 10-digit Indian mobile number
  if (digits.length >= 10 && digits.length <= 15) {
    const last10 = digits.slice(-10);
    if (/^[6-9]\d{9}$/.test(last10)) {
      return last10;
    }
  }

  return null;
}

/**
 * Mask sensitive phone number for secure logging (e.g. 98******10)
 * Prevents plain-text personally identifiable information (PII) leakage in server logs.
 * @param {string} phone 
 * @returns {string}
 */
export function maskPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return 'N/A';
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 6) return '******';
  const start = clean.slice(0, 2);
  const end = clean.slice(-2);
  return `${start}******${end}`;
}

/**
 * Formats standard SMS message text for slot booking confirmation
 * Designed for Quick SMS without DLT variable registration constraints.
 */
export function formatBookingSmsText({ tokenNumber, mandiName, slotDate, slotTime, bookingLink }) {
  let cleanDate = slotDate;
  if (slotDate instanceof Date) {
    const y = slotDate.getFullYear();
    const m = String(slotDate.getMonth() + 1).padStart(2, '0');
    const d = String(slotDate.getDate()).padStart(2, '0');
    cleanDate = `${y}-${m}-${d}`;
  } else if (typeof slotDate === 'string' && slotDate.includes('T')) {
    cleanDate = slotDate.split('T')[0];
  } else if (typeof slotDate === 'string' && slotDate.length > 10) {
    cleanDate = slotDate.slice(0, 10);
  }

  return `KisanSetu: Your mandi slot is confirmed.\nToken: ${tokenNumber}\nMandi: ${mandiName}\nSlot: ${cleanDate} ${slotTime}\nCheck booking: ${bookingLink}`;
}

/**
 * Generic SMS dispatch function supporting Fast2SMS Quick SMS API (and optional fallback providers).
 * 
 * Security & Reliability guarantees:
 * - Never throws an unhandled exception or interrupts business transactions.
 * - Never logs or exposes the API key in console output, errors, or response objects.
 * - Masks recipient phone numbers in all log outputs.
 * - Enforces network timeout (10 seconds).
 * 
 * @param {Object} options
 * @param {string} [options.phone] - Recipient phone number
 * @param {string} [options.to] - Recipient phone number (alias)
 * @param {string} [options.numbers] - Recipient phone number (alias)
 * @param {string} [options.message] - SMS message text
 * @param {string} [options.text] - SMS message text (alias)
 * @param {string} [options.tokenNumber] - Optional token number for contextual logging
 * @param {string} [options.route] - Fast2SMS route (default: 'q' for Quick SMS)
 * @param {string} [options.language] - Message language (default: 'english')
 * @param {number} [options.flash] - Flash SMS flag (default: 0)
 * @returns {Promise<{ success: boolean, status: string, message: string, requestId?: string, details?: any }>}
 */
export async function sendSMS(options = {}) {
  const isSmsEnabled = process.env.SMS_ENABLED === 'true' || process.env.SMS_ENABLED === '1';
  const provider = (process.env.SMS_PROVIDER || 'Fast2SMS').trim();
  const rawPhone = options.phone || options.to || options.numbers;
  const messageText = options.message || options.text || '';
  const tokenNumber = options.tokenNumber || 'N/A';

  // 1. Safe check: Is SMS enabled?
  if (!isSmsEnabled) {
    console.log(`[SMS-SERVICE] SMS is disabled (SMS_ENABLED=false). SMS skipped for token ${tokenNumber}.`);
    return {
      success: false,
      status: 'DISABLED',
      message: 'SMS dispatch is disabled via SMS_ENABLED configuration.',
    };
  }

  // 2. Validate and normalize recipient phone number (10-digit Indian format)
  const normalizedPhone = normalizeIndianPhoneNumber(rawPhone);
  const maskedPhone = maskPhoneNumber(rawPhone || normalizedPhone);

  if (!normalizedPhone) {
    console.warn(`[SMS-SERVICE] [WARN] Missing or invalid recipient phone number (${maskedPhone}). SMS skipped for token ${tokenNumber}.`);
    return {
      success: false,
      status: 'INVALID_PHONE',
      message: `Invalid or missing phone number: ${maskedPhone}`,
    };
  }

  // 3. Provider Switching Logic
  if (provider.toLowerCase() === 'fast2sms') {
    return await sendViaFast2SMS({
      phone: normalizedPhone,
      maskedPhone,
      message: messageText,
      tokenNumber,
      route: options.route || 'q',
      language: options.language || 'english',
      flash: options.flash !== undefined ? options.flash : 0,
    });
  } else if (provider.toLowerCase() === 'msg91') {
    return await sendViaMsg91Legacy({
      phone: normalizedPhone,
      maskedPhone,
      message: messageText,
      tokenNumber,
      options,
    });
  } else {
    // Default fallback to Fast2SMS
    return await sendViaFast2SMS({
      phone: normalizedPhone,
      maskedPhone,
      message: messageText,
      tokenNumber,
      route: options.route || 'q',
      language: options.language || 'english',
      flash: options.flash !== undefined ? options.flash : 0,
    });
  }
}

/**
 * Sends SMS via Fast2SMS Quick SMS API (route=q)
 * Endpoint: POST https://www.fast2sms.com/dev/bulkV2
 */
async function sendViaFast2SMS({ phone, maskedPhone, message, tokenNumber, route = 'q', language = 'english', flash = 0 }) {
  const apiKey = process.env.FAST2SMS_API_KEY?.trim();

  // Validate Fast2SMS API Key
  if (!apiKey || apiKey === 'your_fast2sms_api_key_here' || apiKey === '') {
    console.warn(`[SMS-SERVICE] [WARN] FAST2SMS_API_KEY is not configured or using placeholder. SMS skipped for token ${tokenNumber}.`);
    return {
      success: false,
      status: 'NOT_CONFIGURED',
      message: 'FAST2SMS_API_KEY is not configured in server environment.',
    };
  }

  const payload = {
    route,
    message,
    language,
    flash,
    numbers: phone,
  };

  try {
    console.log(`[SMS-SERVICE] Initiating Fast2SMS Quick SMS (route=${route}) for token ${tokenNumber} to ${maskedPhone}...`);

    const apiUrl = 'https://www.fast2sms.com/dev/bulkV2';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10-second timeout
    });

    const responseText = await response.text();
    let responseData = null;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    // Fast2SMS returns: { return: true, request_id: "...", message: ["SMS sent successfully."] }
    const isSuccess = response.ok && (responseData?.return === true || responseData?.status_code === 200);

    if (isSuccess) {
      const reqId = responseData?.request_id || responseData?.requestId || 'N/A';
      console.log(`[SMS-SERVICE] [SUCCESS] Fast2SMS API accepted request for token ${tokenNumber} to ${maskedPhone} (Request ID: ${reqId}).`);
      return {
        success: true,
        status: 'ACCEPTED',
        message: 'Fast2SMS API request accepted; physical SMS delivery not independently verified.',
        requestId: reqId,
        details: responseData,
      };
    } else {
      let errMsg = 'Fast2SMS API rejected request';
      if (Array.isArray(responseData?.message)) {
        errMsg = responseData.message.join(', ');
      } else if (typeof responseData?.message === 'string') {
        errMsg = responseData.message;
      } else if (responseData?.msg) {
        errMsg = responseData.msg;
      } else {
        errMsg = `HTTP ${response.status} error from Fast2SMS`;
      }

      console.error(`[SMS-SERVICE] [ERROR] Fast2SMS API rejected request for token ${tokenNumber} (${maskedPhone}): ${errMsg}`);
      return {
        success: false,
        status: 'API_ERROR',
        message: errMsg,
        details: responseData,
      };
    }
  } catch (err) {
    console.error(`[SMS-SERVICE] [ERROR] Failed to send SMS via Fast2SMS for token ${tokenNumber} (${maskedPhone}):`, err.message);
    return {
      success: false,
      status: 'NETWORK_ERROR',
      message: err.message,
    };
  }
}

/**
 * Legacy MSG91 Flow handler (retained for optional multi-provider switching).
 */
async function sendViaMsg91Legacy({ phone, maskedPhone, message, tokenNumber, options }) {
  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const templateId = process.env.MSG91_TEMPLATE_ID?.trim();
  const senderId = process.env.MSG91_SENDER_ID?.trim() || 'KSNSET';

  if (!authKey || authKey === 'your_msg91_auth_key_here' || authKey === '') {
    console.warn(`[SMS-SERVICE] [WARN] MSG91_AUTH_KEY is not configured. SMS skipped for token ${tokenNumber}.`);
    return {
      success: false,
      status: 'NOT_CONFIGURED',
      message: 'MSG91_AUTH_KEY is not configured in server environment.',
    };
  }

  // Format 12-digit number for MSG91 (91 + 10 digits)
  const msg91Phone = phone.startsWith('91') ? phone : `91${phone}`;

  const flowPayload = {
    template_id: templateId || undefined,
    sender: senderId,
    short_url: '0',
    recipients: [
      {
        mobiles: msg91Phone,
        token: tokenNumber,
        ...options.templateVariables,
      },
    ],
  };

  try {
    console.log(`[SMS-SERVICE] Initiating legacy MSG91 SMS for token ${tokenNumber} to ${maskedPhone}...`);
    const response = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'authkey': authKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(flowPayload),
      signal: AbortSignal.timeout(10000),
    });

    const responseText = await response.text();
    let responseData = null;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    const isExplicitError = responseData?.type === 'error' || responseData?.status === 'error';
    if (response.ok && !isExplicitError) {
      return {
        success: true,
        status: 'ACCEPTED',
        message: 'MSG91 API request accepted; physical SMS delivery not independently verified.',
        details: responseData,
      };
    } else {
      const errMsg = responseData?.message || responseData?.msg || `HTTP ${response.status} error`;
      return {
        success: false,
        status: 'API_ERROR',
        message: errMsg,
        details: responseData,
      };
    }
  } catch (err) {
    return {
      success: false,
      status: 'NETWORK_ERROR',
      message: err.message,
    };
  }
}

/**
 * Sends booking confirmation SMS to the farmer via Fast2SMS Quick SMS API.
 * 
 * IMPORTANT: This function is strictly designed NEVER to throw an unhandled error
 * or fail the calling booking flow.
 * 
 * @param {Object} params
 * @param {Object} params.booking - Booking record (id, token_number, etc.)
 * @param {Object} params.farmer - Farmer user details (id, phone, full_name)
 * @param {Object} [params.centre] - Mandi centre object (name, code, address)
 * @param {Object} [params.slot] - Slot details (slot_date, start_time, end_time)
 * @returns {Promise<{ success: boolean, status: string, message: string, bookingLink: string, requestId?: string, details?: any }>}
 */
export async function sendBookingConfirmationSms({ booking, farmer, centre, slot }) {
  const tokenNumber = booking?.token_number || 'N/A';
  const publicAppUrl = (process.env.PUBLIC_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
  const bookingLink = `${publicAppUrl}/token/${tokenNumber}`;
  const mandiName = centre?.name || 'Mandi Procurement Centre';
  
  let slotDate = '';
  if (slot?.slot_date) {
    if (typeof slot.slot_date === 'string') {
      slotDate = slot.slot_date.split('T')[0];
    } else if (slot.slot_date instanceof Date) {
      const y = slot.slot_date.getFullYear();
      const m = String(slot.slot_date.getMonth() + 1).padStart(2, '0');
      const d = String(slot.slot_date.getDate()).padStart(2, '0');
      slotDate = `${y}-${m}-${d}`;
    } else {
      slotDate = String(slot.slot_date).slice(0, 10);
    }
  } else if (booking?.created_at) {
    slotDate = typeof booking.created_at === 'string' ? booking.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
  } else {
    slotDate = new Date().toISOString().slice(0, 10);
  }

  const slotTime = (slot?.start_time && slot?.end_time)
    ? `${String(slot.start_time).slice(0, 5)} - ${String(slot.end_time).slice(0, 5)}`
    : 'Scheduled Window';

  const rawPhone = farmer?.phone || booking?.phone;

  // Format SMS message text for Fast2SMS Quick SMS (route=q)
  const smsBody = formatBookingSmsText({
    tokenNumber,
    mandiName,
    slotDate,
    slotTime,
    bookingLink,
  });

  // Dispatch via generic sendSMS
  const smsResult = await sendSMS({
    phone: rawPhone,
    message: smsBody,
    tokenNumber,
    route: 'q',
  });

  return {
    ...smsResult,
    bookingLink,
  };
}

// In-memory deduplication tracker with TTL (5 minutes) to prevent duplicate SMS on accidental retries
const sentSmsTracker = new Map();

/**
 * Checks whether an SMS for a specific workflow stage has already been sent recently for a booking.
 * @param {string} bookingId 
 * @param {string} stage 
 * @returns {boolean}
 */
export function hasSentWorkflowSms(bookingId, stage) {
  if (!bookingId || !stage) return false;
  const key = `${bookingId}_${stage}`;
  const sentAt = sentSmsTracker.get(key);
  if (!sentAt) return false;
  // Expire after 10 minutes
  if (Date.now() - sentAt > 10 * 60 * 1000) {
    sentSmsTracker.delete(key);
    return false;
  }
  return true;
}

/**
 * Records that an SMS for a specific workflow stage was sent.
 * @param {string} bookingId 
 * @param {string} stage 
 */
export function markWorkflowSmsSent(bookingId, stage) {
  if (!bookingId || !stage) return;
  const key = `${bookingId}_${stage}`;
  sentSmsTracker.set(key, Date.now());

  // Clean old entries if Map gets large
  if (sentSmsTracker.size > 2000) {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [k, time] of sentSmsTracker.entries()) {
      if (time < cutoff) sentSmsTracker.delete(k);
    }
  }
}

/**
 * Reset deduplication tracker (useful for unit tests)
 */
export function resetWorkflowSmsTracker() {
  sentSmsTracker.clear();
}

/**
 * Formats SMS text for gate admission / check-in
 */
export function formatGateAdmissionSmsText({ tokenNumber, mandiName, vehicleNumber, bookingLink }) {
  return `KisanSetu: Gate entry confirmed for Token ${tokenNumber} at ${mandiName}.\nVehicle: ${vehicleNumber}\nStatus: Admitted to Waiting Yard.\nTrack status: ${bookingLink}`;
}

/**
 * Sends gate admission SMS to the farmer
 */
export async function sendGateAdmissionSms({ booking, farmer, centre }) {
  const tokenNumber = booking?.token_number || 'N/A';
  const bookingId = booking?.id || tokenNumber;

  if (hasSentWorkflowSms(bookingId, 'GATE_ADMISSION')) {
    console.log(`[SMS-SERVICE] Duplicate GATE_ADMISSION SMS skipped for token ${tokenNumber}.`);
    return { success: true, status: 'SKIPPED_DUPLICATE', message: 'SMS already dispatched for this stage.' };
  }

  const publicAppUrl = (process.env.PUBLIC_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
  const bookingLink = `${publicAppUrl}/token/${tokenNumber}`;
  const mandiName = centre?.name || 'Mandi Procurement Centre';
  const vehicleNumber = booking?.vehicle_number || 'Vehicle';
  const rawPhone = farmer?.phone || booking?.phone;

  const smsBody = formatGateAdmissionSmsText({
    tokenNumber,
    mandiName,
    vehicleNumber,
    bookingLink,
  });

  const smsResult = await sendSMS({
    phone: rawPhone,
    message: smsBody,
    tokenNumber,
    route: 'q',
  });

  if (smsResult.success || smsResult.status === 'ACCEPTED') {
    markWorkflowSmsSent(bookingId, 'GATE_ADMISSION');
  }

  return {
    ...smsResult,
    bookingLink,
  };
}

/**
 * Formats SMS text for quality check inspection results
 */
export function formatQualityCheckSmsText({ tokenNumber, cropName, decision, grainGrade, approvedQty, moisture, remarks }) {
  if (decision === 'REJECT') {
    const reasonText = remarks || 'Does not meet prescribed FAQ specifications';
    return `KisanSetu: Quality inspection REJECTED for Token ${tokenNumber} (${cropName}).\nReason: ${reasonText}\nPlease contact Mandi Helpdesk for assistance.`;
  }
  const moistureText = moisture ? ` (Moisture: ${moisture}%)` : '';
  return `KisanSetu: Quality check PASSED for Token ${tokenNumber} (${cropName}).\nGrade: ${grainGrade || 'FAQ'}\nApproved Qty: ${approvedQty || '0'} Qtl${moistureText}\nPlease proceed to Weighbridge.`;
}

/**
 * Sends Quality Check result SMS to the farmer
 */
export async function sendQualityCheckSms({ booking, farmer, quality, decision, centre }) {
  const tokenNumber = booking?.token_number || 'N/A';
  const bookingId = booking?.id || tokenNumber;
  const stageKey = `QUALITY_${decision || 'PASS'}`;

  if (hasSentWorkflowSms(bookingId, stageKey)) {
    console.log(`[SMS-SERVICE] Duplicate ${stageKey} SMS skipped for token ${tokenNumber}.`);
    return { success: true, status: 'SKIPPED_DUPLICATE', message: 'SMS already dispatched for this stage.' };
  }

  const rawPhone = farmer?.phone || booking?.phone;
  const cropName = booking?.crop_name || 'Grain';

  const smsBody = formatQualityCheckSmsText({
    tokenNumber,
    cropName,
    decision,
    grainGrade: quality?.grain_grade,
    approvedQty: quality?.approved_quantity_quintals || booking?.estimated_quantity_quintals,
    moisture: quality?.moisture_percentage,
    remarks: quality?.remarks,
  });

  const smsResult = await sendSMS({
    phone: rawPhone,
    message: smsBody,
    tokenNumber,
    route: 'q',
  });

  if (smsResult.success || smsResult.status === 'ACCEPTED') {
    markWorkflowSmsSent(bookingId, stageKey);
  }

  return smsResult;
}

/**
 * Formats SMS text for weighbridge gross measurement or rejection
 */
export function formatWeighbridgeSmsText({ tokenNumber, cropName, isGrossOnly, grossWeightKg, decision, remarks }) {
  if (decision === 'REJECT') {
    return `KisanSetu: Weighbridge entry REJECTED for Token ${tokenNumber} (${cropName}).\nReason: ${remarks || 'Weight discrepancy'}\nPlease report to Mandi In-charge.`;
  }
  const formattedGross = Number(grossWeightKg || 0).toLocaleString('en-IN');
  return `KisanSetu: Gross weight recorded for Token ${tokenNumber}.\nGross Weight: ${formattedGross} kg\nPlease proceed to Unloading Bay to unload ${cropName}.`;
}

/**
 * Sends weighbridge gross weight or reject notification to the farmer
 */
export async function sendWeighbridgeSms({ booking, farmer, weighRecord, isGrossOnly = true, decision = 'PASS', remarks, centre }) {
  const tokenNumber = booking?.token_number || 'N/A';
  const bookingId = booking?.id || tokenNumber;
  const stageKey = decision === 'REJECT' ? 'WEIGHBRIDGE_REJECT' : 'WEIGHBRIDGE_GROSS';

  if (hasSentWorkflowSms(bookingId, stageKey)) {
    console.log(`[SMS-SERVICE] Duplicate ${stageKey} SMS skipped for token ${tokenNumber}.`);
    return { success: true, status: 'SKIPPED_DUPLICATE', message: 'SMS already dispatched for this stage.' };
  }

  const rawPhone = farmer?.phone || booking?.phone;
  const cropName = booking?.crop_name || 'Grain';

  const smsBody = formatWeighbridgeSmsText({
    tokenNumber,
    cropName,
    isGrossOnly,
    grossWeightKg: weighRecord?.gross_weight_kg,
    decision,
    remarks,
  });

  const smsResult = await sendSMS({
    phone: rawPhone,
    message: smsBody,
    tokenNumber,
    route: 'q',
  });

  if (smsResult.success || smsResult.status === 'ACCEPTED') {
    markWorkflowSmsSent(bookingId, stageKey);
  }

  return smsResult;
}

/**
 * Formats SMS text for procurement cycle completion & J-Form generation
 */
export function formatProcurementCompletedSmsText({ tokenNumber, cropName, netQuintals, mspRate, netPayable, receiptLink }) {
  const formattedNet = Number(netQuintals || 0).toLocaleString('en-IN');
  const formattedRate = Number(mspRate || 0).toLocaleString('en-IN');
  const formattedPayable = Number(netPayable || 0).toLocaleString('en-IN');

  return `KisanSetu: Procurement COMPLETED for Token ${tokenNumber}.\nCrop: ${cropName} | Net: ${formattedNet} Qtl\nRate: Rs.${formattedRate}/Qtl | Total MSP: Rs.${formattedPayable}\nJ-Form Receipt: ${receiptLink}`;
}

/**
 * Sends procurement completed and J-Form receipt SMS to the farmer
 */
export async function sendProcurementCompletedSms({ booking, farmer, payment, weighRecord, centre }) {
  const tokenNumber = booking?.token_number || 'N/A';
  const bookingId = booking?.id || tokenNumber;

  if (hasSentWorkflowSms(bookingId, 'PROCUREMENT_COMPLETED')) {
    console.log(`[SMS-SERVICE] Duplicate PROCUREMENT_COMPLETED SMS skipped for token ${tokenNumber}.`);
    return { success: true, status: 'SKIPPED_DUPLICATE', message: 'SMS already dispatched for this stage.' };
  }

  const publicAppUrl = (process.env.PUBLIC_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
  const receiptLink = `${publicAppUrl}/token/${tokenNumber}`;
  const rawPhone = farmer?.phone || booking?.phone;
  const cropName = booking?.crop_name || 'Grain';
  const netQuintals = weighRecord?.net_weight_quintals || booking?.estimated_quantity_quintals || 0;
  const mspRate = payment?.msp_rate_per_quintal || 2275;
  const netPayable = payment?.net_payable_amount || (netQuintals * mspRate);

  const smsBody = formatProcurementCompletedSmsText({
    tokenNumber,
    cropName,
    netQuintals,
    mspRate,
    netPayable,
    receiptLink,
  });

  const smsResult = await sendSMS({
    phone: rawPhone,
    message: smsBody,
    tokenNumber,
    route: 'q',
  });

  if (smsResult.success || smsResult.status === 'ACCEPTED') {
    markWorkflowSmsSent(bookingId, 'PROCUREMENT_COMPLETED');
  }

  return {
    ...smsResult,
    receiptLink,
  };
}

/**
 * Formats SMS text for gate/station vehicle call
 */
export function formatGateCallSmsText({ tokenNumber, vehicleNumber, stationName, deskNumber }) {
  const station = stationName || (deskNumber ? `Desk #${deskNumber}` : 'Inspection Bay');
  return `KisanSetu Alert: Token ${tokenNumber} (Vehicle: ${vehicleNumber}) is now requested at Station: ${station}. Please proceed with your vehicle immediately.`;
}

/**
 * Sends station/gate call SMS to the farmer
 */
export async function sendGateCallSms({ booking, farmer, stationName, deskNumber }) {
  const tokenNumber = booking?.token_number || 'N/A';
  const rawPhone = farmer?.phone || booking?.phone;
  const vehicleNumber = booking?.vehicle_number || 'Vehicle';

  const smsBody = formatGateCallSmsText({
    tokenNumber,
    vehicleNumber,
    stationName,
    deskNumber,
  });

  return await sendSMS({
    phone: rawPhone,
    message: smsBody,
    tokenNumber,
    route: 'q',
  });
}

