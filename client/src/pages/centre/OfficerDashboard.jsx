import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Truck, 
  Users, 
  Scale, 
  FlaskConical, 
  CheckCircle2, 
  Volume2, 
  Plus, 
  Search, 
  RefreshCw, 
  ArrowRight, 
  Tv, 
  Layers, 
  AlertCircle,
  Clock,
  FileText
} from 'lucide-react';
import { queueAPI, procurementAPI, centresAPI } from '../../services/api';
import { getSocket, joinCentreRoom } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [selectedCentreId, setSelectedCentreId] = useState('ctr_karnal_01');
  const [centres, setCentres] = useState([]);
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Active Station Filter
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'GATE' | 'QUALITY' | 'WEIGHBRIDGE'

  // Modals
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInTokenInput, setCheckInTokenInput] = useState('');

  const [showQualityModal, setShowQualityModal] = useState(false);
  const [selectedBookingForQuality, setSelectedBookingForQuality] = useState(null);
  const [moistureInput, setMoistureInput] = useState('11.8');
  const [foreignInput, setForeignInput] = useState('0.8');
  const [damagedInput, setDamagedInput] = useState('0.4');

  const [showWeighModal, setShowWeighModal] = useState(false);
  const [selectedBookingForWeigh, setSelectedBookingForWeigh] = useState(null);
  const [grossWeightInput, setGrossWeightInput] = useState('9450');
  const [tareWeightInput, setTareWeightInput] = useState('2850');

  const fetchLiveQueue = async () => {
    try {
      setLoading(true);
      const res = await queueAPI.getLiveQueue(selectedCentreId);
      if (res.data.success) {
        setQueueData(res.data);
      }
    } catch (err) {
      console.error('Queue load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadCentres() {
      try {
        const res = await centresAPI.getAll();
        if (res.data.success) {
          setCentres(res.data.centres);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadCentres();
  }, []);

  useEffect(() => {
    fetchLiveQueue();
  }, [selectedCentreId]);

  // Realtime Socket listener
  useEffect(() => {
    if (selectedCentreId) {
      joinCentreRoom(selectedCentreId);
      const socket = getSocket();

      const handleQueueUpdate = () => {
        fetchLiveQueue();
      };

      socket.on('queue:updated', handleQueueUpdate);
      return () => {
        socket.off('queue:updated', handleQueueUpdate);
      };
    }
  }, [selectedCentreId]);

  // Quick Call Next Action
  const handleCallNext = async (tokenId = null, stationName = 'Gate Desk 1') => {
    setActionSuccess('');
    setActionError('');
    try {
      const res = await queueAPI.callNext(selectedCentreId, {
        token_id: tokenId,
        station_name: stationName,
      });
      if (res.data.success) {
        setActionSuccess(res.data.message);
        fetchLiveQueue();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to call token.');
    }
  };

  // Gate Check-in Action (Form Submit)
  const handleGateCheckIn = async (e) => {
    e.preventDefault();
    setActionSuccess('');
    setActionError('');
    try {
      const res = await queueAPI.checkIn(selectedCentreId, {
        token_number: checkInTokenInput.trim().toUpperCase(),
      });
      if (res.data.success) {
        setActionSuccess(res.data.message);
        setShowCheckInModal(false);
        setCheckInTokenInput('');
        fetchLiveQueue();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Check-in failed. Check token number.');
    }
  };

  // Direct 1-Click Gate Check-in for Scheduled Bookings
  const handleDirectCheckIn = async (tokenNumber) => {
    setActionSuccess('');
    setActionError('');
    try {
      const res = await queueAPI.checkIn(selectedCentreId, {
        token_number: tokenNumber,
      });
      if (res.data.success) {
        setActionSuccess(res.data.message);
        fetchLiveQueue();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Check-in failed.');
    }
  };

  // Submit Quality Inspection
  const handleSubmitQuality = async (e) => {
    e.preventDefault();
    if (!selectedBookingForQuality) return;

    try {
      const res = await procurementAPI.submitQualityCheck({
        booking_id: selectedBookingForQuality.id,
        moisture_percentage: parseFloat(moistureInput),
        foreign_matter_percentage: parseFloat(foreignInput),
        damaged_grains_percentage: parseFloat(damagedInput),
      });

      if (res.data.success) {
        setActionSuccess(res.data.message);
        setShowQualityModal(false);
        fetchLiveQueue();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Quality recording failed.');
    }
  };

  // Submit Weighbridge Gross / Tare Weight
  const handleSubmitWeighbridge = async (e) => {
    e.preventDefault();
    if (!selectedBookingForWeigh) return;

    try {
      const res = await procurementAPI.submitWeighbridge({
        booking_id: selectedBookingForWeigh.id,
        gross_weight_kg: parseFloat(grossWeightInput),
        tare_weight_kg: parseFloat(tareWeightInput),
      });

      if (res.data.success) {
        setActionSuccess(res.data.message);
        setShowWeighModal(false);
        fetchLiveQueue();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Weighbridge recording failed.');
    }
  };

  const stages = queueData?.stages || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* Header & Centre Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-wider">
              OFFICIAL MANDI COMMAND SYSTEM
            </span>
            <span className="text-xs text-slate-500">Live Operator Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2 mt-1">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            Procurement Centre Operations
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Mandi Selector */}
          <select
            value={selectedCentreId}
            onChange={(e) => setSelectedCentreId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-kisan-500"
          >
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowCheckInModal(true)}
            className="px-4 py-2 rounded-xl bg-kisan-600 hover:bg-kisan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-kisan-600/20"
          >
            <Plus className="w-4 h-4" /> Gate QR Check-in
          </button>

          <button
            onClick={() => handleCallNext(null, 'Main Gate Desk')}
            className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Volume2 className="w-4 h-4" /> Call Next in Line
          </button>

          <a
            href={`/display/${selectedCentreId}`}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Open Gate Big Screen TV"
          >
            <Tv className="w-4 h-4 text-sky-400" />
          </a>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-4 space-y-1">
          <span className="text-slate-400 text-xs font-medium">Total Bookings Today</span>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {queueData?.summary?.total_today || 0}
          </div>
          <span className="text-[11px] text-slate-500">Scheduled Slots</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 space-y-1">
          <span className="text-slate-400 text-xs font-medium">Active in Mandi Queue</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
            {queueData?.summary?.in_progress_count || 0}
          </div>
          <span className="text-[11px] text-amber-400/80">Vehicles in yard</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 space-y-1">
          <span className="text-slate-400 text-xs font-medium">Procurement Completed</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            {queueData?.summary?.completed_count || 0}
          </div>
          <span className="text-[11px] text-emerald-400/80">J-Forms Generated</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 space-y-1">
          <span className="text-slate-400 text-xs font-medium">Avg Yard Turnaround</span>
          <div className="text-2xl sm:text-3xl font-black text-sky-400 font-mono">
            ~{queueData?.summary?.estimated_avg_wait_mins || 20}m
          </div>
          <span className="text-[11px] text-slate-500">Fast clearance</span>
        </div>
      </div>

      {/* Station Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { key: 'ALL', label: 'All Live Stages (Kanban)', icon: Layers },
          { key: 'BOOKED', label: `Scheduled Slots (${stages.booked?.length || 0})`, icon: Clock },
          { key: 'GATE', label: `1. Gate Waiting (${(stages.waiting_at_gate?.length || 0) + (stages.called?.length || 0)})`, icon: Truck },
          { key: 'QUALITY', label: `2. Quality Lab (${stages.quality_inspection?.length || 0})`, icon: FlaskConical },
          { key: 'WEIGHBRIDGE', label: `3. Weighbridge (${(stages.weighing?.length || 0) + (stages.unloading?.length || 0)})`, icon: Scale },
          { key: 'COMPLETED', label: `4. Procured (${stages.completed?.length || 0})`, icon: CheckCircle2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-kisan-600 text-white shadow-md'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Kanban Board of Stages */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs">Refreshing live Mandi stream...</div>
      ) : (
        <div className={`grid grid-cols-1 gap-5 ${
          activeTab === 'ALL' ? 'md:grid-cols-2 lg:grid-cols-5' : 'md:grid-cols-2 lg:grid-cols-3'
        }`}>
          
          {/* COLUMN 0: Scheduled Bookings (Upcoming / Pre-Arrival) */}
          {(activeTab === 'ALL' || activeTab === 'BOOKED') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-400" />
                  Scheduled Slots ({stages.booked?.length || 0})
                </span>
                <span className="badge-status badge-blue text-[10px]">BOOKED</span>
              </div>

              <div className="space-y-3">
                {stages.booked?.map((b) => (
                  <div key={b.id} className="p-4 rounded-2xl bg-slate-900/90 border border-sky-500/30 space-y-3 hover:border-sky-500/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-black text-sky-400">{b.token_number}</span>
                      <span className="badge-status badge-blue text-[10px]">
                        {b.slot_time || 'Scheduled'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="font-bold text-white">{b.farmer_name}</p>
                      <p className="text-slate-400">{b.crop_name} • {b.estimated_quantity_quintals} Qtl</p>
                      <p className="font-mono text-slate-300 text-[11px]">{b.vehicle_number} ({b.vehicle_type})</p>
                      {b.farmer_phone && <p className="text-slate-500 font-mono text-[10px]">Ph: {b.farmer_phone}</p>}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex gap-2">
                      <button
                        onClick={() => handleDirectCheckIn(b.token_number)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors shadow-sm flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Admit to Gate
                      </button>
                    </div>
                  </div>
                ))}
                {(!stages.booked || stages.booked.length === 0) && (
                  <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-500">
                    No scheduled slots pending arrival.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* COLUMN 1: Waiting at Gate / Called */}
          {(activeTab === 'ALL' || activeTab === 'GATE') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-amber-400" />
                  Waiting at Yard ({(stages.waiting_at_gate?.length || 0) + (stages.called?.length || 0)})
                </span>
                <span className="badge-status badge-yellow text-[10px]">STAGE 1</span>
              </div>

              <div className="space-y-3">
                {[...(stages.called || []), ...(stages.waiting_at_gate || [])].map((b) => (
                  <div key={b.id} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-black text-amber-400">{b.token_number}</span>
                      <span className={`badge-status ${b.status === 'CALLED' ? 'badge-blue' : 'badge-yellow'} text-[10px]`}>
                        {b.status}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="font-bold text-white">{b.farmer_name}</p>
                      <p className="text-slate-400">{b.crop_name} • {b.estimated_quantity_quintals} Qtl</p>
                      <p className="font-mono text-slate-300 text-[11px]">{b.vehicle_number} ({b.vehicle_type})</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex gap-2">
                      <button
                        onClick={() => handleCallNext(b.id, 'Quality Testing Lab')}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold transition-colors"
                      >
                        Send to Quality Lab
                      </button>
                    </div>
                  </div>
                ))}
                {(!stages.waiting_at_gate || stages.waiting_at_gate.length === 0) && (!stages.called || stages.called.length === 0) && (
                  <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-500">
                    No vehicles waiting at gate.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* COLUMN 2: Quality Inspection Lab */}
          {(activeTab === 'ALL' || activeTab === 'QUALITY') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-purple-400" />
                  Quality Lab ({stages.quality_inspection?.length || 0})
                </span>
                <span className="badge-status badge-purple text-[10px]">STAGE 2</span>
              </div>

              <div className="space-y-3">
                {stages.quality_inspection?.map((b) => (
                  <div key={b.id} className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-black text-purple-300">{b.token_number}</span>
                      <span className="badge-status badge-purple text-[10px]">TESTING</span>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="font-bold text-white">{b.farmer_name}</p>
                      <p className="text-slate-400">{b.crop_name} ({b.crop_variety})</p>
                      <p className="font-mono text-slate-300 text-[11px]">{b.vehicle_number}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedBookingForQuality(b);
                          setShowQualityModal(true);
                        }}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition-colors"
                      >
                        Enter Quality Test Results
                      </button>
                    </div>
                  </div>
                ))}
                {(!stages.quality_inspection || stages.quality_inspection.length === 0) && (
                  <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-500">
                    No vehicles currently in lab.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* COLUMN 3: Weighbridge & Unloading */}
          {(activeTab === 'ALL' || activeTab === 'WEIGHBRIDGE') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-sky-400" />
                  Weighbridge ({(stages.weighing?.length || 0) + (stages.unloading?.length || 0)})
                </span>
                <span className="badge-status badge-blue text-[10px]">STAGE 3</span>
              </div>

              <div className="space-y-3">
                {[...(stages.weighing || []), ...(stages.unloading || [])].map((b) => (
                  <div key={b.id} className="p-4 rounded-2xl bg-slate-900/90 border border-sky-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-black text-sky-300">{b.token_number}</span>
                      <span className="badge-status badge-blue text-[10px]">{b.status}</span>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="font-bold text-white">{b.farmer_name}</p>
                      <p className="text-slate-400">{b.crop_name} • Est: {b.estimated_quantity_quintals} Qtl</p>
                      <p className="font-mono text-slate-300 text-[11px]">{b.vehicle_number}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedBookingForWeigh(b);
                          setShowWeighModal(true);
                        }}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold transition-colors"
                      >
                        Log Weighbridge Weights
                      </button>
                    </div>
                  </div>
                ))}
                {(!stages.weighing || stages.weighing.length === 0) && (!stages.unloading || stages.unloading.length === 0) && (
                  <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-500">
                    No vehicles at weighbridge.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* COLUMN 4: Procured & Cleared */}
          {(activeTab === 'ALL' || activeTab === 'COMPLETED') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Procured ({stages.completed?.length || 0})
                </span>
                <span className="badge-status badge-green text-[10px]">DONE</span>
              </div>

              <div className="space-y-3">
                {stages.completed?.map((b) => (
                  <div key={b.id} className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-black text-emerald-400">{b.token_number}</span>
                      <span className="badge-status badge-green text-[10px]">J-FORM READY</span>
                    </div>

                    <div className="text-xs space-y-0.5">
                      <p className="font-bold text-white">{b.farmer_name}</p>
                      <p className="text-slate-400">{b.crop_name} • {b.weighbridge_log?.net_weight_quintals || b.estimated_quantity_quintals} Qtl</p>
                      {b.payment_info && (
                        <p className="font-bold text-emerald-400">
                          ₹{b.payment_info.net_payable_amount.toLocaleString('en-IN')} (DBT)
                        </p>
                      )}
                    </div>

                    <div className="pt-1 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>{new Date(b.completion_time || Date.now()).toLocaleTimeString()}</span>
                      <a
                        href={`/token/${b.token_number}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-kisan-400 font-semibold hover:underline"
                      >
                        Receipt →
                      </a>
                    </div>
                  </div>
                ))}
                {(!stages.completed || stages.completed.length === 0) && (
                  <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-500">
                    No completed procurements yet today.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 1. Gate Check-in Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-kisan-400" />
              Mandi Gate Entry Check-in
            </h3>
            <p className="text-xs text-slate-400">
              Enter the token number from farmer's mobile screen or printed pass:
            </p>

            <form onSubmit={handleGateCheckIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Token Number (or QR Code)
                </label>
                <input
                  type="text"
                  value={checkInTokenInput}
                  onChange={(e) => setCheckInTokenInput(e.target.value)}
                  placeholder="e.g. TK-KRL-101 or MND-042"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-base font-mono uppercase focus:outline-none focus:border-kisan-500"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-kisan-600 hover:bg-kisan-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Check In Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Quality Lab Input Modal */}
      {showQualityModal && selectedBookingForQuality && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-purple-400">
                  {selectedBookingForQuality.token_number}
                </span>
                <h3 className="font-bold text-white text-base">Lab Quality Inspection</h3>
              </div>
              <span className="text-xs text-slate-400">{selectedBookingForQuality.crop_name}</span>
            </div>

            <form onSubmit={handleSubmitQuality} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Moisture Content (%): Standard &le; 12.0%
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={moistureInput}
                  onChange={(e) => setMoistureInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Foreign Matter / Chaff (%): Standard &le; 1.0%
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={foreignInput}
                  onChange={(e) => setForeignInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Damaged / Shriveled Grains (%): Standard &le; 1.0%
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={damagedInput}
                  onChange={(e) => setDamagedInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-purple-200">
                Grade will be calculated automatically: <strong>Grade A / FAQ / Rejected</strong>.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQualityModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Save Lab Results & Forward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Weighbridge Input Modal */}
      {showWeighModal && selectedBookingForWeigh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-sky-400">
                  {selectedBookingForWeigh.token_number}
                </span>
                <h3 className="font-bold text-white text-base">Weighbridge Measurement</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">{selectedBookingForWeigh.vehicle_number}</span>
            </div>

            <form onSubmit={handleSubmitWeighbridge} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Gross Weight (Loaded Vehicle in KG)
                </label>
                <input
                  type="number"
                  value={grossWeightInput}
                  onChange={(e) => setGrossWeightInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Tare Weight (Empty Vehicle in KG) — Leave 0 if currently unloading
                </label>
                <input
                  type="number"
                  value={tareWeightInput}
                  onChange={(e) => setTareWeightInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/20 text-sky-200 flex justify-between font-mono">
                <span>Calculated Net Grain:</span>
                <span className="font-bold text-white">
                  {Math.max(0, parseFloat(grossWeightInput || 0) - parseFloat(tareWeightInput || 0))} KG (
                  {((Math.max(0, parseFloat(grossWeightInput || 0) - parseFloat(tareWeightInput || 0))) / 100).toFixed(2)} Qtl)
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWeighModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
                >
                  Finalize Weight & Complete J-Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
