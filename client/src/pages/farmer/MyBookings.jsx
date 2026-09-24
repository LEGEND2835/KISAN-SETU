import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  RefreshCw,
  IndianRupee,
  Plus,
  ArrowRight,
  X,
  Loader2
} from 'lucide-react';
import { slotsAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function MyBookings() {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reschedule Modal States
  const [reschedulingBooking, setReschedulingBooking] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedNewSlotId, setSelectedNewSlotId] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submittingReschedule, setSubmittingReschedule] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await slotsAPI.getMyBookings();
      if (res.data.success) {
        setBookings(res.data.bookings);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Open Reschedule Modal
  const handleOpenReschedule = (booking) => {
    setFeedback({ type: '', message: '' });
    setSelectedNewSlotId('');
    setReschedulingBooking(booking);

    const todayStr = new Date().toISOString().split('T')[0];
    const initialDate = booking.slot_date && booking.slot_date >= todayStr ? booking.slot_date : todayStr;
    setRescheduleDate(initialDate);
  };

  // Fetch available slots when reschedule date or target booking changes
  useEffect(() => {
    if (reschedulingBooking && rescheduleDate) {
      async function loadSlots() {
        setLoadingSlots(true);
        try {
          const res = await slotsAPI.getAvailable(reschedulingBooking.centre_id, rescheduleDate);
          if (res.data.success) {
            setAvailableSlots(res.data.slots || []);
          }
        } catch (err) {
          console.error('Error loading alternative slots:', err);
          setFeedback({ type: 'error', message: 'Failed to load alternative slots for this date.' });
        } finally {
          setLoadingSlots(false);
        }
      }
      loadSlots();
    }
  }, [reschedulingBooking, rescheduleDate]);

  // Submit Reschedule Request
  const handleConfirmReschedule = async () => {
    if (!reschedulingBooking || !selectedNewSlotId) {
      setFeedback({ type: 'error', message: 'Please select a new time slot.' });
      return;
    }

    setSubmittingReschedule(true);
    setFeedback({ type: '', message: '' });

    try {
      const res = await slotsAPI.rescheduleBooking(reschedulingBooking.id, {
        new_slot_id: selectedNewSlotId,
      });

      if (res.data.success) {
        setFeedback({
          type: 'success',
          message: res.data.message || 'Slot rescheduled successfully!',
        });
        await fetchBookings();
        setTimeout(() => {
          setReschedulingBooking(null);
          setSelectedNewSlotId('');
          setFeedback({ type: '', message: '' });
        }, 1200);
      }
    } catch (err) {
      console.error('Reschedule error:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to reschedule. Please choose another slot.',
      });
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const selectedNewSlot = availableSlots.find(s => s.id === selectedNewSlotId);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Ticket className="w-7 h-7 text-amber-400" />
            My Procurement Passes & Receipts
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            View active queue tokens, appointment passes, and DBT payout status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBookings}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/book-slot"
            className="px-4 py-2.5 rounded-xl bg-kisan-600 hover:bg-kisan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-kisan-600/20"
          >
            <Plus className="w-4 h-4" /> Book New Slot
          </Link>
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="py-16 text-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-kisan-400 mx-auto" />
          <p className="text-xs text-slate-400">Loading your passes...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center space-y-4">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Bookings Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You haven't reserved any Mandi procurement slots yet. Book your first slot in 60 seconds!
          </p>
          <Link
            to="/book-slot"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-kisan-600 hover:bg-kisan-500 text-white text-xs font-bold"
          >
            Book Slot Now <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="glass-panel glass-panel-hover rounded-2xl p-5 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-sm font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    {b.token_number}
                  </span>
                  <span
                    className={`badge-status ${b.status === 'PROCURED'
                        ? 'badge-green'
                        : b.status === 'BOOKED'
                          ? 'badge-blue'
                          : 'badge-yellow'
                      }`}
                  >
                    {b.status.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="font-bold text-white text-base">{b.centre_name}</h3>
                <p className="text-xs text-slate-400">{b.crop_name} • {b.estimated_quantity_quintals} Quintals</p>

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Slot Date & Time:</span>
                    <span className="font-semibold text-white">{b.slot_date} ({b.slot_time})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vehicle:</span>
                    <span className="font-mono font-semibold text-amber-300">{b.vehicle_number}</span>
                  </div>
                  {b.payment_info && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>DBT Payout:</span>
                      <span>₹{b.payment_info.net_payable_amount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <Link
                  to={`/token/${b.token_number}`}
                  className="flex-1 text-center py-2 px-3 rounded-xl bg-kisan-600/20 hover:bg-kisan-600/30 text-kisan-300 border border-kisan-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Ticket className="w-3.5 h-3.5" /> View QR Pass
                </Link>

                {/* Reschedule Button: Active only for upcoming scheduled bookings */}
                {b.status === 'BOOKED' && (
                  <button
                    type="button"
                    onClick={() => handleOpenReschedule(b)}
                    className="py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Reschedule to another time slot"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Reschedule
                  </button>
                )}

                {b.status === 'PROCURED' && (
                  <Link
                    to={`/token/${b.token_number}`}
                    className="p-2 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-colors"
                    title="e-J-Form Receipt"
                  >
                    <FileText className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reschedule Slot Compact Modal */}
      {reschedulingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Reschedule Mandi Slot</h3>
                  <p className="text-[11px] text-slate-400">Select an alternative time slot without re-booking</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReschedulingBooking(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Booking Info Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Token Number:</span>
                <span className="font-mono font-bold text-amber-300">{reschedulingBooking.token_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Procurement Mandi:</span>
                <span className="font-semibold text-white">{reschedulingBooking.centre_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Currently Scheduled:</span>
                <span className="font-semibold text-rose-300">
                  {reschedulingBooking.slot_date} ({reschedulingBooking.slot_time})
                </span>
              </div>
            </div>

            {/* Date Picker (4-Day Window) */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Select Rescheduled Date
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[0, 1, 2, 3].map((daysAhead) => {
                  const d = new Date();
                  d.setDate(d.getDate() + daysAhead);
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  const dStr = `${y}-${m}-${day}`;
                  const dayName = daysAhead === 0 ? 'Today' : daysAhead === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
                  const dateNum = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

                  return (
                    <button
                      key={dStr}
                      type="button"
                      onClick={() => {
                        setRescheduleDate(dStr);
                        setSelectedNewSlotId('');
                      }}
                      className={`px-3 py-2 rounded-xl border text-center flex flex-col items-center min-w-[78px] transition-all text-xs ${rescheduleDate === dStr
                          ? 'bg-kisan-600 text-white border-kisan-500 shadow-md'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                    >
                      <span className="font-bold">{dayName}</span>
                      <span className="text-[10px] opacity-80">{dateNum}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Available Time Slots Grid */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Available 2-Hour Slots
              </label>

              {loadingSlots ? (
                <div className="py-6 text-center space-y-2 text-xs text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400 mx-auto" />
                  <p>Checking slot capacity...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 text-center text-xs text-slate-400">
                  No slots found for this date.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {availableSlots.map((s) => {
                    const isCurrentSlot = s.id === reschedulingBooking.slot_id;
                    const isSelected = selectedNewSlotId === s.id;
                    const isFull = !s.is_bookable;
                    const isPast = s.is_past;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={isCurrentSlot || isFull}
                        onClick={() => setSelectedNewSlotId(s.id)}
                        className={`p-3 rounded-xl border text-left transition-all text-xs ${isCurrentSlot
                            ? 'opacity-50 bg-slate-950 border-amber-500/30 text-slate-400 cursor-not-allowed'
                            : isFull
                              ? 'opacity-40 bg-slate-950 border-slate-800 text-slate-500 cursor-not-allowed'
                              : isSelected
                                ? 'bg-kisan-600/30 border-kisan-400 ring-1 ring-kisan-400 text-white shadow-md'
                                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-kisan-400" />
                            {s.start_time} - {s.end_time}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isCurrentSlot ? 'bg-amber-500/20 text-amber-300' :
                              isPast ? 'bg-slate-800 text-slate-400' :
                                s.congestion_color === 'GREEN' ? 'bg-emerald-500/20 text-emerald-300' :
                                  s.congestion_color === 'YELLOW' ? 'bg-amber-500/20 text-amber-300' :
                                    'bg-rose-500/20 text-rose-300'
                            }`}>
                            {isCurrentSlot ? 'Current' : isPast ? 'Ended' : `${s.occupancy_percentage}% Full`}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex justify-between mt-1">
                          <span>Capacity:</span>
                          <span className="font-semibold text-slate-200">
                            {isCurrentSlot ? 'Your Active Slot' : isPast ? 'Unavailable' : `${s.remaining_tokens} tokens left`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Clear Before/After Comparison Bar */}
            {selectedNewSlot && (
              <div className="p-3.5 rounded-xl bg-kisan-950/40 border border-kisan-500/40 text-xs space-y-1.5 animate-fade-in">
                <span className="text-[10px] font-bold uppercase tracking-wider text-kisan-400 block">
                  Reschedule Preview
                </span>
                <div className="flex items-center justify-between text-slate-300 text-[11px]">
                  <span>Previous: <strong className="text-slate-400 line-through">{reschedulingBooking.slot_date} ({reschedulingBooking.slot_time})</strong></span>
                  <ArrowRight className="w-3.5 h-3.5 text-kisan-400" />
                  <span>New: <strong className="text-emerald-400">{rescheduleDate} ({selectedNewSlot.start_time} - {selectedNewSlot.end_time})</strong></span>
                </div>
              </div>
            )}

            {/* Feedback Alert */}
            {feedback.message && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReschedulingBooking(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                disabled={submittingReschedule || !selectedNewSlotId}
                className="px-5 py-2.5 rounded-xl bg-kisan-600 hover:bg-kisan-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-kisan-600/30 disabled:opacity-50"
              >
                {submittingReschedule ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rescheduling...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Reschedule
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}