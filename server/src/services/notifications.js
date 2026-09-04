/**
 * KisanSetu Central Notification Service
 * Orchestrates multi-channel notifications (SMS via Fast2SMS, Real-time WebSockets, etc.)
 */

import { 
  sendSMS, 
  sendBookingConfirmationSms, 
  sendGateAdmissionSms,
  sendQualityCheckSms,
  sendWeighbridgeSms,
  sendProcurementCompletedSms,
  sendGateCallSms,
  formatBookingSmsText,
  formatGateAdmissionSmsText,
  formatQualityCheckSmsText,
  formatWeighbridgeSmsText,
  formatProcurementCompletedSmsText,
  formatGateCallSmsText,
  normalizeIndianPhoneNumber,
  maskPhoneNumber,
  hasSentWorkflowSms,
  markWorkflowSmsSent,
  resetWorkflowSmsTracker
} from './smsService.js';

export {
  sendSMS,
  sendBookingConfirmationSms,
  sendGateAdmissionSms,
  sendQualityCheckSms,
  sendWeighbridgeSms,
  sendProcurementCompletedSms,
  sendGateCallSms,
  formatBookingSmsText,
  formatGateAdmissionSmsText,
  formatQualityCheckSmsText,
  formatWeighbridgeSmsText,
  formatProcurementCompletedSmsText,
  formatGateCallSmsText,
  normalizeIndianPhoneNumber,
  maskPhoneNumber,
  hasSentWorkflowSms,
  markWorkflowSmsSent,
  resetWorkflowSmsTracker,
};

/**
 * Generic notification dispatcher
 * @param {Object} params
 * @param {string} params.phone - Recipient mobile number
 * @param {string} params.message - Notification message text
 * @param {string} [params.type] - Notification category (e.g. 'BOOKING', 'PAYMENT', 'QUEUE_UPDATE')
 * @returns {Promise<{ success: boolean, status: string, message: string }>}
 */
export async function sendNotification({ phone, message, type = 'GENERAL' }) {
  return await sendSMS({
    phone,
    message,
  });
}

/**
 * Sends a payment / MSP disbursement notification to a farmer
 * @param {Object} params
 * @param {string} params.phone
 * @param {string} params.farmerName
 * @param {string|number} params.amount
 * @param {string} params.tokenNumber
 * @param {string} [params.status]
 */
export async function sendPaymentNotification({ phone, farmerName, amount, tokenNumber, status = 'DISBURSED' }) {
  const message = `KisanSetu: Payment of Rs.${amount} for Token ${tokenNumber} has been ${status.toLowerCase()}. Thank you for trading at Mandi.`;
  return await sendSMS({
    phone,
    message,
    tokenNumber,
  });
}

/**
 * Sends a queue progression / gate call notification to a farmer
 * @param {Object} params
 * @param {string} params.phone
 * @param {string} params.tokenNumber
 * @param {string} params.stationName
 * @param {string} [params.estimatedWaitMinutes]
 */
export async function sendQueueUpdateNotification({ phone, tokenNumber, stationName, estimatedWaitMinutes }) {
  const waitText = estimatedWaitMinutes ? ` Est. wait: ~${estimatedWaitMinutes} mins.` : '';
  const message = `KisanSetu Alert: Token ${tokenNumber} is now requested at Station: ${stationName}.${waitText} Please proceed with your vehicle.`;
  return await sendSMS({
    phone,
    message,
    tokenNumber,
  });
}

export default {
  sendSMS,
  sendBookingConfirmationSms,
  sendGateAdmissionSms,
  sendQualityCheckSms,
  sendWeighbridgeSms,
  sendProcurementCompletedSms,
  sendGateCallSms,
  sendNotification,
  sendPaymentNotification,
  sendQueueUpdateNotification,
  formatBookingSmsText,
  formatGateAdmissionSmsText,
  formatQualityCheckSmsText,
  formatWeighbridgeSmsText,
  formatProcurementCompletedSmsText,
  formatGateCallSmsText,
  normalizeIndianPhoneNumber,
  maskPhoneNumber,
  hasSentWorkflowSms,
  markWorkflowSmsSent,
  resetWorkflowSmsTracker,
};
