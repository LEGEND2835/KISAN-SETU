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
  Plus
} from 'lucide-react';
import { slotsAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function MyBookings() {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

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
                    className={`badge-status ${
                      b.status === 'PROCURED'
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
                  <Ticket className="w-3.5 h-3.5" /> View Digital QR Pass
                </Link>
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

    </div>
  );
}
