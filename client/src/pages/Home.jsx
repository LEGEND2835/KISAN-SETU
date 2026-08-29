import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Tractor, 
  Calendar, 
  Search, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Tv, 
  AlertCircle,
  Truck,
  Layers,
  IndianRupee,
  ChevronRight
} from 'lucide-react';
import { centresAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const MSP_DATA = [
  { crop: 'Wheat (गेहूं)', rate: '₹2,275', unit: 'per Qtl', change: '+₹150' },
  { crop: 'Paddy Basmati (धान)', rate: '₹4,200', unit: 'per Qtl', change: '+₹220' },
  { crop: 'Mustard (सरसों)', rate: '₹5,650', unit: 'per Qtl', change: '+₹300' },
  { crop: 'Gram (चना)', rate: '₹5,440', unit: 'per Qtl', change: '+₹105' },
  { crop: 'Maize (मक्का)', rate: '₹2,090', unit: 'per Qtl', change: '+₹90' },
  { crop: 'Soybean (सोयाबीन)', rate: '₹4,600', unit: 'per Qtl', change: '+₹140' },
];

export default function Home({ onOpenAiModal }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [tokenSearchInput, setTokenSearchInput] = useState('');
  const [centres, setCentres] = useState([]);
  const [loadingCentres, setLoadingCentres] = useState(true);

  useEffect(() => {
    async function loadCentres() {
      try {
        const res = await centresAPI.getAll();
        if (res.data.success) {
          setCentres(res.data.centres);
        }
      } catch (err) {
        console.error('Failed to load centres:', err);
      } finally {
        setLoadingCentres(false);
      }
    }
    loadCentres();
  }, []);

  const handleTrackToken = (e) => {
    e.preventDefault();
    if (tokenSearchInput.trim()) {
      navigate(`/token/${tokenSearchInput.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="space-y-16 py-6 sm:py-10">
      
      {/* 1. Live MSP Ticker */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl overflow-hidden">
          <div className="flex items-center gap-3 mb-2 px-1">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5" />
              {t('live_msp_rates')}
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">| Official FCI Procurement Floor Price</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {MSP_DATA.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between hover:border-kisan-500/40 transition-colors"
              >
                <span className="text-xs font-medium text-slate-300 truncate">{item.crop}</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-bold text-white font-mono">{item.rate}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">{item.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-kisan-950/40 to-slate-900 border border-slate-800 p-8 sm:p-14 shadow-2xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-kisan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-3xl space-y-6">
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-kisan-500/10 border border-kisan-500/30 text-kisan-400 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Next-Gen National Mandi Platform
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              {t('hero_title')}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              {t('hero_subtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/book-slot"
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-kisan-600 to-kisan-500 hover:from-kisan-500 hover:to-kisan-400 text-white font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-kisan-600/30 transition-all hover:scale-[1.02]"
              >
                <Calendar className="w-5 h-5" />
                {t('cta_book_now')}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>

              <button
                onClick={onOpenAiModal}
                className="px-5 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-amber-300 font-semibold text-sm sm:text-base flex items-center gap-2 transition-all hover:border-amber-400/50"
              >
                <Sparkles className="w-5 h-5 text-amber-400" />
                {t('cta_ai_help')}
              </button>

              <Link
                to="/centre/officer"
                className="px-5 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium text-sm sm:text-base flex items-center gap-2 transition-colors"
              >
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                {t('nav_officer_portal')}
              </Link>
            </div>

            {/* Quick Live Token Search Input */}
            <div className="pt-6 border-t border-slate-800/80">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Already have a token? Check live queue status:
              </p>
              <form onSubmit={handleTrackToken} className="flex max-w-md gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tokenSearchInput}
                    onChange={(e) => setTokenSearchInput(e.target.value)}
                    placeholder="Enter Token (e.g. TK-101 or MND-042)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-kisan-500 uppercase font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-semibold transition-colors flex items-center gap-1.5"
                >
                  Track <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>

      {/* 3. Live Mandi Centres Load & Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Truck className="w-6 h-6 text-kisan-400" />
              Live Mandi Capacity & Traffic Overview
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Realtime queue status across participating procurement hubs
            </p>
          </div>
          <Link
            to="/display/ctr_karnal_01"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 bg-sky-500/10 px-3 py-1.5 rounded-lg border border-sky-500/20"
          >
            <Tv className="w-4 h-4" /> Launch Mandi Gate Big Screen
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {loadingCentres ? (
            <div className="col-span-4 py-12 text-center text-slate-400 text-sm">
              Loading live Mandi hubs...
            </div>
          ) : (
            centres.map((c) => (
              <div
                key={c.id}
                className="glass-panel glass-panel-hover rounded-2xl p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                    <span
                      className={`badge-status ${
                        c.congestion_level === 'LOW'
                          ? 'badge-green'
                          : c.congestion_level === 'MODERATE'
                          ? 'badge-yellow'
                          : 'badge-red'
                      }`}
                    >
                      {c.congestion_level} TRAFFIC
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base line-clamp-1">{c.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.address}</p>

                  <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Active Trucks in Queue:</span>
                      <span className="font-bold text-white">{c.active_in_queue_count}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Est. Wait Time:</span>
                      <span className="font-bold text-amber-400">~{c.avg_wait_minutes} mins</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Daily Capacity:</span>
                      <span className="font-semibold text-slate-200">{c.daily_capacity_quintals} Qtl</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <Link
                    to={`/book-slot?centreId=${c.id}`}
                    className="flex-1 text-center py-2 px-3 rounded-xl bg-kisan-600 hover:bg-kisan-500 text-white text-xs font-semibold transition-colors"
                  >
                    Book Slot
                  </Link>
                  <Link
                    to={`/display/${c.id}`}
                    target="_blank"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Open Gate Display"
                  >
                    <Tv className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Why KisanSetu System Advantages */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Designed for Trust, Speed & Transparency
          </h2>
          <p className="text-slate-400 text-sm">
            Empowering millions of farmers with fair, timely and automated MSP grain procurement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-kisan-500/20 text-kisan-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-lg">Predictable Zero-Wait Slots</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Book dedicated 2-hour windows in advance. Say goodbye to 14-hour overnight truck queues on highways.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-lg">Transparent Lab & Weighbridge</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Automated moisture and grain grade recording with digital weighbridge receipts (J-Form) generated instantly.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-lg">Direct DBT Payout Tracking</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Live ledger tracking for direct bank deposits under official Minimum Support Price (MSP) government rates.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
