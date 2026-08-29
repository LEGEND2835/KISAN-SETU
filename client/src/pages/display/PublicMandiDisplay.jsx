import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Tv, 
  Clock, 
  Volume2, 
  VolumeX, 
  Truck, 
  FlaskConical, 
  Scale, 
  Sparkles, 
  Tractor,
  IndianRupee,
  Maximize2
} from 'lucide-react';
import { queueAPI, centresAPI } from '../../services/api';
import { getSocket, joinCentreRoom } from '../../services/socket';

export default function PublicMandiDisplay() {
  const { centreId = 'ctr_karnal_01' } = useParams();
  const [centre, setCentre] = useState(null);
  const [queueData, setQueueData] = useState(null);
  const [lastCalled, setLastCalled] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Digital Clock Tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchLiveQueue = async () => {
    try {
      const res = await queueAPI.getLiveQueue(centreId);
      if (res.data.success) {
        setQueueData(res.data);
        setCentre(res.data.centre);
      }
    } catch (e) {
      console.error('Display queue fetch error:', e);
    }
  };

  useEffect(() => {
    fetchLiveQueue();
  }, [centreId]);

  // Realtime Socket listener
  useEffect(() => {
    joinCentreRoom(centreId);
    const socket = getSocket();

    const handleQueueUpdate = () => {
      fetchLiveQueue();
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
      fetchLiveQueue();
    };

    socket.on('queue:updated', handleQueueUpdate);
    socket.on('token:called', handleTokenCall);

    return () => {
      socket.off('queue:updated', handleQueueUpdate);
      socket.off('token:called', handleTokenCall);
    };
  }, [centreId, audioEnabled]);

  const stages = queueData?.stages || {};

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 flex flex-col justify-between font-sans selection:bg-none">
      
      {/* 1. Header Display Bar */}
      <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-kisan-600 flex items-center justify-center shadow-lg shadow-kisan-600/30">
            <Tractor className="w-9 h-9 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase">
                {centre?.name || 'Mandi Procurement Hub'}
              </h1>
              <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-md">
                LIVE QUEUE
              </span>
            </div>
            <p className="text-slate-400 text-sm font-semibold mt-0.5">
              Code: {centre?.code || 'MND-01'} • Government MSP Direct Procurement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
              audioEnabled ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            <span>{audioEnabled ? 'Voice Chime ON' : 'Muted'}</span>
          </button>

          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {currentTime.toLocaleTimeString()}
            </div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
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
              {stages.quality_inspection?.map((b) => (
                <div key={b.id} className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/50 flex items-center justify-between">
                  <div>
                    <span className="text-3xl font-black font-mono text-purple-300">{b.token_number}</span>
                    <p className="text-xs text-slate-300 font-semibold mt-1">{b.farmer_name}</p>
                  </div>
                  <span className="font-mono text-xs text-purple-200 bg-purple-900/60 px-2.5 py-1 rounded-lg">
                    {b.vehicle_number}
                  </span>
                </div>
              ))}
              {(!stages.quality_inspection || stages.quality_inspection.length === 0) && (
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
              {stages.weighing?.map((b) => (
                <div key={b.id} className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/50 flex items-center justify-between">
                  <div>
                    <span className="text-3xl font-black font-mono text-sky-300">{b.token_number}</span>
                    <p className="text-xs text-slate-300 font-semibold mt-1">{b.farmer_name}</p>
                  </div>
                  <span className="font-mono text-xs text-sky-200 bg-sky-900/60 px-2.5 py-1 rounded-lg">
                    {b.vehicle_number}
                  </span>
                </div>
              ))}
              {(!stages.weighing || stages.weighing.length === 0) && (
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
              {[...(stages.called || []), ...(stages.waiting_at_gate || [])].slice(0, 5).map((b, idx) => (
                <div key={b.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-mono font-bold text-xs">
                      #{idx + 1}
                    </span>
                    <span className="text-xl font-black font-mono text-white">{b.token_number}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{b.vehicle_number}</span>
                </div>
              ))}
              {(!stages.waiting_at_gate || stages.waiting_at_gate.length === 0) && (!stages.called || stages.called.length === 0) && (
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
