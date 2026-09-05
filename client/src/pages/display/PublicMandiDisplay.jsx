import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Tv, 
  Clock, 
  Volume2, 
  VolumeX, 
  Truck, 
  FlaskConical, 
  Scale, 
  ChevronDown, 
  Check, 
  Building2, 
  AlertTriangle, 
  RefreshCw,
  Radio
} from 'lucide-react';
import { queueAPI, centresAPI } from '../../services/api';
import { getSocket, joinCentreRoom, leaveCentreRoom } from '../../services/socket';

export default function PublicMandiDisplay() {
  const { centreId: urlCentreId } = useParams();
  const navigate = useNavigate();

  // Active Mandis List State
  const [activeCentres, setActiveCentres] = useState([]);
  const [loadingCentres, setLoadingCentres] = useState(true);
  const [selectedCentreId, setSelectedCentreId] = useState(urlCentreId || null);

  // Selected Mandi & Queue State
  const [centre, setCentre] = useState(null);
  const [queueData, setQueueData] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [lastCalled, setLastCalled] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  // Ref to isolate asynchronous responses & prevent race conditions
  const activeRequestIdRef = useRef(null);
  const dropdownRef = useRef(null);

  // 1. Digital Clock Tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Click-outside listener for custom mandi selector dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSelectorOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3. Fetch Active Mandis List from Backend Source of Truth (GET /api/centres)
  const fetchActiveCentres = async () => {
    try {
      const res = await centresAPI.getAll();
      if (res.data.success && Array.isArray(res.data.centres)) {
        // Enforce active-only filtering from source of truth (centres.is_active)
        const activeOnly = res.data.centres.filter(c => c.is_active !== false);
        setActiveCentres(activeOnly);
        return activeOnly;
      }
    } catch (err) {
      console.error('[MandiTV] Error fetching active centres:', err);
    } finally {
      setLoadingCentres(false);
    }
    return [];
  };

  // Initial fetch and periodic polling (every 8s) for dynamic updates when mandis are added/toggled
  useEffect(() => {
    fetchActiveCentres();
    const interval = setInterval(() => {
      fetchActiveCentres();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // 4. Determine & Synchronize Selected Mandi based on active list and URL parameter
  useEffect(() => {
    if (loadingCentres) return;

    if (activeCentres.length === 0) {
      // Zero active mandis state
      setSelectedCentreId(null);
      setCentre(null);
      setQueueData(null);
      return;
    }

    const currentTargetId = urlCentreId || selectedCentreId;
    const matchingCentre = activeCentres.find(c => c.id === currentTargetId);

    if (matchingCentre) {
      // Target is valid and active
      if (selectedCentreId !== matchingCentre.id) {
        setSelectedCentreId(matchingCentre.id);
      }
      if (urlCentreId !== matchingCentre.id) {
        navigate(`/display/${matchingCentre.id}`, { replace: true });
      }
    } else {
      // Current target is invalid or became inactive -> automatically fallback to first active mandi
      const fallbackCentre = activeCentres[0];
      setSelectedCentreId(fallbackCentre.id);
      navigate(`/display/${fallbackCentre.id}`, { replace: true });
    }
  }, [activeCentres, urlCentreId, loadingCentres]);

  // 5. Fetch Queue Data for Currently Selected Mandi with strict isolation
  const fetchLiveQueue = async (targetId) => {
    if (!targetId) return;

    // Track active request ID to ignore stale responses from previously selected mandis
    activeRequestIdRef.current = targetId;
    setLoadingQueue(true);

    try {
      const res = await queueAPI.getLiveQueue(targetId);
      // Ensure response matches the currently active selection
      if (activeRequestIdRef.current === targetId && res.data.success) {
        setQueueData(res.data);
        if (res.data.centre) {
          setCentre(res.data.centre);
        } else {
          const cObj = activeCentres.find(c => c.id === targetId);
          if (cObj) setCentre(cObj);
        }
      }
    } catch (e) {
      console.error(`[MandiTV] Live queue fetch error for centre ${targetId}:`, e);
    } finally {
      if (activeRequestIdRef.current === targetId) {
        setLoadingQueue(false);
      }
    }
  };

  // Trigger live queue fetch & clear stale state whenever selected centre changes
  useEffect(() => {
    if (!selectedCentreId) return;

    // Isolate data: clear previous mandi's queue data immediately
    setQueueData(null);
    setLastCalled(null);

    const cObj = activeCentres.find(c => c.id === selectedCentreId);
    if (cObj) setCentre(cObj);

    fetchLiveQueue(selectedCentreId);
  }, [selectedCentreId]);

  // 6. Realtime Socket listener with proper room join / leave lifecycle
  useEffect(() => {
    if (!selectedCentreId) return;

    joinCentreRoom(selectedCentreId);
    const socket = getSocket();

    const handleQueueUpdate = () => {
      fetchLiveQueue(selectedCentreId);
    };

    const handleTokenCall = (callData) => {
      setLastCalled(callData);
      if (audioEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = `Token number ${callData.tokenNumber}. Please proceed to ${callData.stationName}. Token number ${callData.tokenNumber}.`;
        const utterance = new SpeechSynthesisUtterance(msg);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
      fetchLiveQueue(selectedCentreId);
    };

    socket.on('queue:updated', handleQueueUpdate);
    socket.on('queue_updated', handleQueueUpdate);
    socket.on('token:called', handleTokenCall);
    socket.on('token_called', handleTokenCall);

    return () => {
      leaveCentreRoom(selectedCentreId);
      socket.off('queue:updated', handleQueueUpdate);
      socket.off('queue_updated', handleQueueUpdate);
      socket.off('token:called', handleTokenCall);
      socket.off('token_called', handleTokenCall);
    };
  }, [selectedCentreId, audioEnabled]);

  // Mandi Switch Handler
  const handleSelectMandi = (newMandiId) => {
    if (newMandiId === selectedCentreId) {
      setIsSelectorOpen(false);
      return;
    }
    setIsSelectorOpen(false);
    setSelectedCentreId(newMandiId);
    navigate(`/display/${newMandiId}`);
  };

  const stages = queueData?.stages || {};

  // =========================================================================
  // VIEW: ZERO ACTIVE MANDIS STANDBY SCREEN
  // =========================================================================
  if (!loadingCentres && activeCentres.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 sm:p-12 flex flex-col justify-between font-sans selection:bg-none">
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-white shadow-xl ring-2 ring-amber-400 p-1 flex items-center justify-center">
              <img src="/logo.png" alt="KisanSetu Official Seal" className="w-full h-full object-cover rounded-full" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">KisanSetu Mandi Public Display</h1>
              <p className="text-slate-400 text-xs font-semibold mt-0.5">Ministry of Agriculture & Farmers Welfare • National Procurement Network</p>
            </div>
          </div>
          <div className="text-right font-mono text-xl sm:text-2xl font-black text-emerald-400">
            {currentTime.toLocaleTimeString()}
          </div>
        </div>

        <div className="max-w-2xl mx-auto my-auto text-center p-8 sm:p-12 rounded-3xl bg-slate-900/90 border-2 border-amber-500/30 shadow-2xl space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase">No Active Mandi Centres Available</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              All procurement yards are currently offline or marked inactive. As soon as an administrator activates a Mandi Centre, this display board will automatically refresh and resume live queue broadcasts.
            </p>
          </div>
          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setLoadingCentres(true);
                fetchActiveCentres();
              }}
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20"
            >
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Retry / Check Mandi Status</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between text-xs text-slate-400">
          <span>Official Public Procurement Broadcasting System</span>
          <span className="font-mono">Standby Mode • Auto-syncing every 8 seconds</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: MAIN ACTIVE MANDI TV DISPLAY
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 flex flex-col justify-between font-sans selection:bg-none">
      
      {/* 1. Header Display Bar with Dynamic Mandi Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b-2 border-slate-800 pb-4 gap-4">
        
        {/* Logo & Dynamic Mandi Switcher */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-white shadow-xl shadow-kisan-600/40 ring-2 ring-kisan-400 p-1 flex items-center justify-center shrink-0">
            <img 
              src="/logo.png" 
              alt="KisanSetu Official Seal" 
              className="w-full h-full object-cover rounded-full"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Dynamic Mandi Dropdown Selector */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border-2 border-amber-500/50 hover:border-amber-400 text-left transition-all group shadow-lg"
                  title="Switch Mandi Display Screen"
                >
                  <Building2 className="w-5 h-5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-lg sm:text-2xl font-black tracking-tight text-white uppercase flex items-center gap-2">
                      <span>{centre?.name || activeCentres[0]?.name || 'Select Mandi'}</span>
                      <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-amber-400 transition-transform duration-200 ${isSelectorOpen ? 'rotate-180' : ''}`} />
                    </span>
                  </div>
                </button>

                {/* Dropdown Menu of Active Mandis */}
                {isSelectorOpen && (
                  <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-3xl bg-slate-900/98 backdrop-blur-xl border-2 border-slate-700 shadow-2xl py-3 z-50 animate-fade-in divide-y divide-slate-800">
                    <div className="px-4 py-2 text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Select Active Mandi Yard ({activeCentres.length})</span>
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                        <Radio className="w-3 h-3 animate-pulse" /> LIVE SYNC
                      </span>
                    </div>

                    <div className="max-h-80 overflow-y-auto py-1">
                      {activeCentres.map((c) => {
                        const isSelected = c.id === selectedCentreId;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectMandi(c.id)}
                            className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors hover:bg-slate-800/80 ${
                              isSelected ? 'bg-amber-500/15 text-amber-300 font-bold border-l-4 border-amber-400' : 'text-slate-200'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold text-white flex items-center gap-2">
                                {c.name}
                              </p>
                              <p className="text-xs text-slate-400 font-mono">
                                Code: {c.code} • {c.district}, {c.state}
                              </p>
                            </div>
                            {isSelected && (
                              <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                                <Check className="w-4 h-4 stroke-[3]" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-md tracking-wider flex items-center gap-1 shrink-0">
                <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping"></span>
                LIVE QUEUE
              </span>
            </div>

            <p className="text-slate-400 text-xs sm:text-sm font-semibold mt-1">
              Code: <span className="font-mono text-slate-200">{centre?.code || 'MND'}</span> • {centre?.district ? `${centre.district}, ${centre.state}` : 'Government MSP Direct Procurement Yard'}
            </p>
          </div>
        </div>

        {/* Right Action Icons & Digital Clock */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0 justify-between lg:justify-end">
          <button
            type="button"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
              audioEnabled ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-5 h-5 text-amber-400" /> : <VolumeX className="w-5 h-5" />}
            <span>{audioEnabled ? 'Voice Chime ON' : 'Muted'}</span>
          </button>

          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {currentTime.toLocaleTimeString()}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider">
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Flashing Last Called Token Announcement Box */}
      {lastCalled && (
        <div className="my-6 p-6 rounded-3xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-2xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-mono text-2xl font-black">
              📢
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-widest bg-slate-950 text-amber-300 px-3 py-0.5 rounded-full">
                NOW CALLING TO {lastCalled.stationName}
              </span>
              <div className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-slate-950 mt-1">
                TOKEN #{lastCalled.tokenNumber}
              </div>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-2xl font-black text-slate-950">{lastCalled.farmerName}</div>
            <div className="text-lg font-mono font-bold text-slate-900">{lastCalled.vehicleNumber} ({lastCalled.cropName})</div>
          </div>
        </div>
      )}

      {/* 3. Main Stage Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6 flex-1">
        
        {/* Quality Testing Station */}
        <div className="bg-slate-900/90 border-2 border-purple-500/40 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="text-lg font-black text-purple-400 flex items-center gap-2">
                <FlaskConical className="w-6 h-6" /> Quality Lab
              </span>
              <span className="text-xs font-mono font-bold bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full">
                Desk 1 & 2
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {loadingQueue ? (
                <div className="py-12 text-center text-slate-500 font-semibold text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Loading Quality Stage...</span>
                </div>
              ) : stages.quality_inspection?.length > 0 ? (
                stages.quality_inspection.map((b) => (
                  <div key={b.id} className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/50 flex items-center justify-between">
                    <div>
                      <span className="text-3xl font-black font-mono text-purple-300">{b.token_number}</span>
                      <p className="text-xs text-slate-300 font-semibold mt-1">{b.farmer_name}</p>
                    </div>
                    <span className="font-mono text-xs text-purple-200 bg-purple-900/60 px-2.5 py-1 rounded-lg">
                      {b.vehicle_number}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-500 font-semibold text-sm">
                  Lab Currently Clear
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Weighbridge Station */}
        <div className="bg-slate-900/90 border-2 border-sky-500/40 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="text-lg font-black text-sky-400 flex items-center gap-2">
                <Scale className="w-6 h-6" /> Weighbridge
              </span>
              <span className="text-xs font-mono font-bold bg-sky-500/20 text-sky-300 px-3 py-1 rounded-full">
                Gross & Tare
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {loadingQueue ? (
                <div className="py-12 text-center text-slate-500 font-semibold text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  <span>Loading Weighbridge Stage...</span>
                </div>
              ) : stages.weighing?.length > 0 ? (
                stages.weighing.map((b) => (
                  <div key={b.id} className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/50 flex items-center justify-between">
                    <div>
                      <span className="text-3xl font-black font-mono text-sky-300">{b.token_number}</span>
                      <p className="text-xs text-slate-300 font-semibold mt-1">{b.farmer_name}</p>
                    </div>
                    <span className="font-mono text-xs text-sky-200 bg-sky-900/60 px-2.5 py-1 rounded-lg">
                      {b.vehicle_number}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-500 font-semibold text-sm">
                  Weighbridge Ready
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Next in Line (Waiting Area) */}
        <div className="bg-slate-900/90 border-2 border-amber-500/40 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="text-lg font-black text-amber-400 flex items-center gap-2">
                <Truck className="w-6 h-6" /> Next in Queue
              </span>
              <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full">
                Standby
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {loadingQueue ? (
                <div className="py-12 text-center text-slate-500 font-semibold text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Loading Gate Queue...</span>
                </div>
              ) : ([...(stages.called || []), ...(stages.waiting_at_gate || [])].length > 0) ? (
                [...(stages.called || []), ...(stages.waiting_at_gate || [])].slice(0, 5).map((b, idx) => (
                  <div key={b.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-mono font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <span className="text-xl font-black font-mono text-white">{b.token_number}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{b.vehicle_number}</span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-500 font-semibold text-sm">
                  Queue Clear
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 4. Bottom Live Marquee / Ticker */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-3 font-semibold">
          <span className="bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded text-[10px]">
            NOTICE
          </span>
          <span>Ensure moisture is below 12.0% for instant Grade A approval. Have your bank details ready for direct DBT transfer.</span>
        </div>
        <div className="text-slate-500 font-mono hidden md:block">
          Powered by KisanSetu • National Mandi Network
        </div>
      </div>

    </div>
  );
}
