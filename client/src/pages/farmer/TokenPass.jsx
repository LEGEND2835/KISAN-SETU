import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Ticket, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Truck, 
  FileText, 
  AlertCircle, 
  Sparkles, 
  Volume2, 
  RefreshCw,
  Printer,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { slotsAPI, aiAPI, procurementAPI } from '../../services/api';
import { getSocket, joinCentreRoom } from '../../services/socket';
import { useLanguage } from '../../context/LanguageContext';

const STAGES = [
  { key: 'BOOKED', label: 'Slot Booked', desc: 'Pass ready for gate security' },
  { key: 'CHECKED_IN', label: 'At Gate / Parking', desc: 'Checked in by security' },
  { key: 'CALLED', label: 'Called to Bay', desc: 'Proceed to inspection desk' },
  { key: 'QUALITY_INSPECTION', label: 'Quality Lab', desc: 'Moisture & purity analysis' },
  { key: 'WEIGHING', label: 'Weighbridge', desc: 'Gross weight measurement' },
  { key: 'UNLOADING', label: 'Unloading Shed', desc: 'Crop bagging / dump' },
  { key: 'PROCURED', label: 'Procured & J-Form Ready', desc: 'DBT Payment initiated' },
];

export default function TokenPass() {
  const { id } = useParams();
  const { t } = useLanguage();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [etaData, setEtaData] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fetchBookingData = async () => {
    try {
      setLoading(true);
      const res = await slotsAPI.getBookingPass(id);
      if (res.data.success) {
        setBooking(res.data.booking);
        // Fetch AI ETA
        try {
          const aiRes = await aiAPI.predictWaitTime(res.data.booking.id);
          if (aiRes.data.success) setEtaData(aiRes.data);
        } catch (e) {
          console.warn('AI ETA fetch error:', e);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Booking token pass not found. Please verify token number.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingData();
  }, [id]);

  // Realtime Socket listener
  useEffect(() => {
    if (booking?.centre_id) {
      joinCentreRoom(booking.centre_id);
      const socket = getSocket();

      const handleQueueUpdate = () => {
        fetchBookingData();
      };

      const handleTokenCall = (data) => {
        if (data.tokenNumber === booking.token_number) {
          // Play audio announcement if supported
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(
              `Token number ${booking.token_number}, please proceed to ${data.stationName}`
            );
            window.speechSynthesis.speak(utterance);
          }
          fetchBookingData();
        }
      };

      socket.on('queue:updated', handleQueueUpdate);
      socket.on('token:called', handleTokenCall);

      return () => {
        socket.off('queue:updated', handleQueueUpdate);
        socket.off('token:called', handleTokenCall);
      };
    }
  }, [booking?.centre_id, booking?.token_number]);

  const handleOpenReceipt = async () => {
    try {
      const res = await procurementAPI.getReceipt(booking.id);
      if (res.data.success) {
        setReceiptData(res.data.receipt);
        setShowReceiptModal(true);
      }
    } catch (e) {
      console.error('Error fetching receipt:', e);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-kisan-400 mx-auto" />
        <p className="text-slate-400 text-sm">Loading digital token pass & live queue status...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Token Not Found</h2>
        <p className="text-xs text-slate-400">{error || 'Unable to retrieve token details.'}</p>
        <Link
          to="/"
          className="inline-block px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  // Determine current stage index for stepper
  const currentStageIndex = STAGES.findIndex(s => s.key === booking.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in print:p-0 print:m-0 print:max-w-none">
      
      {/* 1. Digital Pass Card (Screen: Interactive Live / Print: Static Clean 1-Page Pass) */}
      <div className={`printable-pass-card relative rounded-3xl overflow-hidden border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-900 to-kisan-950/40 shadow-2xl p-6 sm:p-8 print:p-6 print:border-2 print:border-slate-800 ${showReceiptModal ? 'print:hidden' : ''}`}>
        
        {/* Top Pass Badge & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 print:border-slate-300 print:pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-lg shadow-kisan-600/30 ring-2 ring-kisan-500/50 p-0.5 flex items-center justify-center print:ring-1 print:ring-slate-400 print:shadow-none">
              <img 
                src="/logo.png" 
                alt="Official Mandi Seal" 
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-kisan-400 print:text-emerald-700">
                  Official Mandi Entry Pass
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold print:border-emerald-700 print:text-emerald-800 print:bg-emerald-50">
                  VERIFIED QR
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white print:text-slate-900">{booking.centre_name}</h1>
            </div>
          </div>

          {/* Interactive Action Buttons (Hidden on Print) */}
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Pass
            </button>
            <button
              onClick={fetchBookingData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
              title="Refresh Live Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Core Token & QR Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-slate-800 print:border-slate-300 print:py-4 items-center">
          
          {/* Token Big Typography Box */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-1 print:bg-slate-50 print:border-slate-300 print:p-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider print:text-slate-600">
              Assigned Token No.
            </span>
            <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono tracking-tight print:text-slate-900">
              {booking.token_number}
            </div>
            {/* Live Station Badge (Hidden on Print) */}
            <span className="inline-block text-[11px] font-bold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-full mt-1 no-print">
              Station: {booking.current_station || 'Gate Waiting'}
            </span>
          </div>

          {/* Key Procurement Details */}
          <div className="space-y-3 text-xs print:text-slate-900 print:space-y-2">
            <div>
              <span className="text-slate-500 block text-[11px] print:text-slate-500 font-medium">Farmer Name:</span>
              <span className="font-bold text-white text-sm print:text-slate-900">{booking.farmer_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] print:text-slate-500 font-medium">Crop & Est. Quantity:</span>
              <span className="font-bold text-slate-200 print:text-slate-900">
                {booking.crop_name} ({booking.estimated_quantity_quintals} Quintals)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] print:text-slate-500 font-medium">Vehicle Number:</span>
              <span className="font-mono font-bold text-amber-300 text-sm print:text-slate-900">
                {booking.vehicle_number} ({booking.vehicle_type})
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] print:text-slate-500 font-medium">Reserved Slot Time:</span>
              <span className="font-bold text-white flex items-center gap-1 print:text-slate-900">
                <Clock className="w-3.5 h-3.5 text-kisan-400 print:text-slate-700" />
                {booking.slot_date} ({booking.slot_time})
              </span>
            </div>
          </div>

          {/* Digital QR Code Box */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white text-slate-900 text-center space-y-2 shadow-xl print:shadow-none print:border print:border-slate-300">
            <QRCodeSVG
              value={booking.qr_code_hash || booking.token_number}
              size={130}
              level="H"
              includeMargin={false}
            />
            <span className="text-[10px] font-mono font-bold text-slate-700 tracking-wider">
              SCAN AT MANDI GATE
            </span>
          </div>

        </div>

        {/* Live Queue ETA Callout (Active on Screen, Hidden on Print) */}
        {booking.status !== 'PROCURED' && etaData && (
          <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  AI Dynamic Queue Predictor
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                    Live
                  </span>
                </h3>
                <p className="text-xs text-amber-200/80 mt-0.5">{etaData.advice}</p>
              </div>
            </div>

            <div className="text-left sm:text-right flex-shrink-0">
              <div className="text-2xl font-black text-amber-400 font-mono">
                ~{etaData.estimated_wait_minutes} Mins
              </div>
              <span className="text-[11px] text-slate-400">
                {etaData.vehicles_ahead_count} vehicles ahead in queue
              </span>
            </div>
          </div>
        )}

        {/* Rejection Notice Banner (Active on Screen, Hidden on Print) */}
        {booking.status === 'REJECTED' && (
          <div className="mt-6 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in no-print">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">Lot Procurement Rejected</h3>
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                    {booking.rejection_stage === 'WEIGHBRIDGE' ? 'Weighbridge Rejection' : 'Quality Lab Rejection'}
                  </span>
                </div>
                <p className="text-xs text-rose-200">
                  <strong>Reason:</strong> {booking.rejection_reason || booking.quality_check?.remarks || 'Grain lot did not satisfy the minimum prescribed MSP fair average quality parameters.'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Please proceed to the Mandi Exit Gate or contact the Mandi Appeal Grievance Officer desk for re-grading options.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Completed Procurement Banner (Active on Screen, Hidden on Print) */}
        {booking.status === 'PROCURED' && (
          <div className="mt-6 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Procurement Successfully Completed!</h3>
                <p className="text-xs text-emerald-200/80">
                  Quality graded, weighbridge net weight logged & DBT payment voucher created.
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenReceipt}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
            >
              <FileText className="w-4 h-4" />
              View & Print e-J-Form Receipt
            </button>
          </div>
        )}

        {/* Official Printable Verification Footer (Visible Only on Paper Print) */}
        <div className="hidden print:block pt-4 border-t border-slate-300 text-[10px] text-slate-600">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold">Ministry of Agriculture & Farmers Welfare • e-APMC Mandi System</p>
              <p>Please present this QR token pass at the boom barrier scanner for automated gate entry.</p>
            </div>
            <div className="text-right font-mono">
              <p>Generated: {new Date().toLocaleDateString('en-IN')}</p>
              <p>Pass ID: {booking.id}</p>
            </div>
          </div>
        </div>

      </div>

      {/* 2. Realtime Queue Progress Timeline Stepper (Active on Screen, Hidden on Print) */}
      <div className={`glass-panel rounded-3xl p-6 sm:p-8 space-y-6 no-print ${showReceiptModal ? 'print:hidden' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-kisan-400" />
              Live Stage-by-Stage Mandi Queue Tracker
            </h2>
            <p className="text-xs text-slate-400">Updates in realtime without page refresh</p>
          </div>
          <span className="badge-status badge-blue">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
            LIVE WEBSOCKET
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {STAGES.map((s, idx) => {
            const isCompleted = currentStageIndex > idx;
            const isCurrent = currentStageIndex === idx;

            return (
              <div
                key={s.key}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500'
                    : isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-300'
                    : 'bg-slate-950/40 border-slate-800/80 opacity-40 text-slate-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold">0{idx + 1}</span>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isCurrent ? (
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                      </span>
                    ) : null}
                  </div>
                  <h4 className={`font-bold text-xs ${isCurrent ? 'text-amber-300' : isCompleted ? 'text-white' : 'text-slate-400'}`}>
                    {s.label}
                  </h4>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 leading-tight">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. J-Form Receipt Modal & Clean Printable e-J-Form Document */}
      {showReceiptModal && receiptData && (
        <div className="printable-jform-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:p-0 print:static">
          <div className="printable-jform-doc w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto print:max-h-none print:border-2 print:border-emerald-700 print:bg-white print:p-6">
            
            {/* J-Form Printable Header */}
            <div className="text-center border-b border-slate-800 pb-4 space-y-1 print:border-slate-300 print:pb-3">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 print:text-emerald-800 print:border-emerald-600 print:bg-emerald-50">
                <ShieldCheck className="w-3.5 h-3.5" />
                Ministry of Agriculture & Farmers Welfare • Directorate of Marketing & Inspection
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white pt-2 print:text-slate-900">
                e-Procurement Certificate (J-Form)
              </h2>
              <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-1 print:text-slate-600">
                <span>Receipt Number: <strong className="font-mono text-white print:text-slate-900">{receiptData.receipt_number}</strong></span>
                <span>•</span>
                <span>Date: <strong className="text-slate-200 print:text-slate-900">{new Date(receiptData.generated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>
              </div>
            </div>

            {/* Farmer & Mandi Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950/70 p-4 rounded-2xl border border-slate-800 print:bg-slate-50 print:border-slate-300 print:text-slate-900">
              <div>
                <span className="text-slate-500 block text-[10px] print:text-slate-600 font-semibold uppercase">Farmer Details:</span>
                <span className="font-bold text-white text-sm print:text-slate-900">{receiptData.farmer.name}</span>
                {receiptData.farmer.phone && <p className="text-slate-400 font-mono print:text-slate-700">Mobile: {receiptData.farmer.phone}</p>}
                <p className="text-slate-400 print:text-slate-700">Aadhaar: **** {receiptData.farmer.aadhaar_last4}</p>
                <p className="text-slate-400 print:text-slate-700">Bank A/c: **** {receiptData.farmer.bank_account_last4} ({receiptData.farmer.ifsc_code})</p>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] print:text-slate-600 font-semibold uppercase">Procurement Centre:</span>
                <span className="font-bold text-white text-sm print:text-slate-900">{receiptData.centre.name}</span>
                <p className="text-slate-400 print:text-slate-700">{receiptData.centre.address}</p>
                <p className="text-slate-400 font-mono print:text-slate-700">Code: {receiptData.centre.code}</p>
                <p className="text-emerald-400 font-medium text-[11px] mt-0.5 print:text-emerald-700 font-bold">DBT Payment Status: {receiptData.procurement_details.payment_status}</p>
              </div>
            </div>

            {/* Procurement Weight & MSP Table */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden text-xs print:border-slate-300 print:rounded-lg">
              <table className="w-full text-left print:border-collapse">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                  <tr>
                    <th className="p-3 print:p-2">Parameter</th>
                    <th className="p-3 print:p-2">Recorded Value</th>
                    <th className="p-3 print:p-2">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 print:divide-slate-300 print:text-slate-900">
                  <tr>
                    <td className="p-3 font-semibold text-white print:text-slate-900 print:p-2">Crop & Variety</td>
                    <td className="p-3 print:p-2">{receiptData.procurement_details.crop_name} ({receiptData.procurement_details.crop_variety})</td>
                    <td className="p-3 text-emerald-400 font-semibold print:text-emerald-800 print:p-2">{receiptData.procurement_details.grain_grade}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-white print:text-slate-900 print:p-2">Moisture Content</td>
                    <td className="p-3 print:p-2">{receiptData.procurement_details.moisture_percentage}%</td>
                    <td className="p-3 text-slate-400 print:text-slate-600 print:p-2">Standard &le; 12.0%</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-white print:text-slate-900 print:p-2">Gross / Tare Weight</td>
                    <td className="p-3 print:p-2">{receiptData.procurement_details.gross_weight_kg} kg / {receiptData.procurement_details.tare_weight_kg} kg</td>
                    <td className="p-3 text-slate-400 print:text-slate-600 print:p-2">Calibrated Weighbridge</td>
                  </tr>
                  <tr className="bg-emerald-950/20 font-bold text-emerald-300 print:bg-emerald-50 print:text-emerald-900">
                    <td className="p-3 print:p-2">Net Procurement Weight</td>
                    <td className="p-3 print:p-2">{receiptData.procurement_details.net_weight_quintals} Quintals</td>
                    <td className="p-3 print:p-2">Verified Net Weight</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-white print:text-slate-900 print:p-2">Official MSP Rate</td>
                    <td className="p-3 font-mono font-bold print:text-slate-900 print:p-2">₹{receiptData.procurement_details.msp_rate_per_quintal} / Qtl</td>
                    <td className="p-3 text-slate-400 print:text-slate-600 print:p-2">Govt Floor Rate</td>
                  </tr>
                  <tr className="bg-slate-950 font-bold text-white text-sm print:bg-slate-100 print:text-slate-900">
                    <td className="p-3 print:p-2">Total Payable (DBT)</td>
                    <td className="p-3 font-mono text-emerald-400 text-base print:text-emerald-800 print:p-2">
                      ₹{receiptData.procurement_details.net_payable_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-[11px] text-emerald-400 print:text-emerald-800 print:p-2">
                      Status: {receiptData.procurement_details.payment_status}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Official Digital Attestation Seal for Print */}
            <div className="hidden print:block pt-3 border-t border-slate-300 text-[10px] text-slate-600">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">Digitally Signed by APMC Mandi In-Charge</p>
                  <p>National Agriculture Market (e-NAM) / DBT Procurement Network</p>
                </div>
                <div className="text-right">
                  <p className="font-mono">Verification: VALID_AUTHENTIC</p>
                </div>
              </div>
            </div>

            {/* Interactive Modal Actions (Hidden on Print) */}
            <div className="flex items-center justify-between pt-2 no-print">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-kisan-600 hover:bg-kisan-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Download / Print Official J-Form
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
