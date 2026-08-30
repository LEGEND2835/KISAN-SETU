import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { 
  Calendar, 
  Clock, 
  Tractor, 
  MapPin, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  Truck,
  Layers,
  ChevronRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { centresAPI, slotsAPI, aiAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const CROPS = [
  { name: 'Wheat', variety: 'HD-2967 (Grade A)', msp: '₹2,275/Qtl', icon: '🌾' },
  { name: 'Paddy (Basmati)', variety: 'Pusa 1121', msp: '₹4,200/Qtl', icon: '🌾' },
  { name: 'Paddy (PR)', variety: 'PR-126', msp: '₹2,183/Qtl', icon: '🌾' },
  { name: 'Mustard', variety: 'Pusa Bold', msp: '₹5,650/Qtl', icon: '🌱' },
  { name: 'Gram', variety: 'Kabuli/Desi', msp: '₹5,440/Qtl', icon: '🌿' },
  { name: 'Maize', variety: 'Hybrid Yellow', msp: '₹2,090/Qtl', icon: '🌽' },
  { name: 'Soybean', variety: 'JS-335', msp: '₹4,600/Qtl', icon: '🌱' },
];

const VEHICLES = [
  { type: 'Bullock Cart', capacity: '10-30 Quintals', maxCap: 30, icon: '🐂' },
  { type: 'Mini Truck (Tata Ace/407)', capacity: '30-70 Quintals', maxCap: 70, icon: '🚚' },
  { type: 'Tractor Trolley', capacity: '50-100 Quintals', maxCap: 100, icon: '🚜' },
  { type: 'Heavy Truck', capacity: '150-300 Quintals', maxCap: 300, icon: '🚛' },
];

export default function BookSlot() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Wizard Step State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1: Crop & Vehicle Form
  const [cropName, setCropName] = useState('Wheat');
  const [cropVariety, setCropVariety] = useState('HD-2967 (Grade A)');
  const [estimatedQuantity, setEstimatedQuantity] = useState('60');
  const [vehicleType, setVehicleType] = useState('Tractor Trolley');
  const [vehicleNumber, setVehicleNumber] = useState('HR-05-AB-1234');

  // Step 2: Mandi Selection & AI Recommendations
  const [centres, setCentres] = useState([]);
  const [selectedCentreId, setSelectedCentreId] = useState(searchParams.get('centreId') || '');
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [loadingAi, setLoadingAi] = useState(false);

  // Step 3: Slot Date & Time
  const [slotDate, setSlotDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Load initial centres
  useEffect(() => {
    async function loadCentres() {
      try {
        const res = await centresAPI.getAll();
        if (res.data.success) {
          setCentres(res.data.centres);
          if (!selectedCentreId && res.data.centres.length > 0) {
            setSelectedCentreId(res.data.centres[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching centres:', err);
      }
    }
    loadCentres();
  }, []);

  // Fetch AI Recommendations when reaching Step 2
  useEffect(() => {
    if (step === 2) {
      async function fetchAiRecs() {
        setLoadingAi(true);
        try {
          const res = await aiAPI.getRecommendations({
            crop_name: cropName,
            quantity_quintals: parseFloat(estimatedQuantity),
            preferred_date: slotDate,
          });
          if (res.data.success) {
            setAiRecommendations(res.data.recommendations);
          }
        } catch (err) {
          console.error('AI rec error:', err);
        } finally {
          setLoadingAi(false);
        }
      }
      fetchAiRecs();
    }
  }, [step, cropName, estimatedQuantity, slotDate]);

  // Fetch available slots when reaching Step 3 or changing date/centre
  useEffect(() => {
    if (step === 3 && selectedCentreId) {
      async function fetchSlots() {
        setLoadingSlots(true);
        try {
          const res = await slotsAPI.getAvailable(selectedCentreId, slotDate);
          if (res.data.success) {
            setAvailableSlots(res.data.slots);
            if (res.data.slots.length > 0) {
              const firstOpen = res.data.slots.find(s => s.is_bookable);
              setSelectedSlotId(firstOpen ? firstOpen.id : '');
            } else {
              setSelectedSlotId('');
            }
          }
        } catch (err) {
          console.error('Fetch slots error:', err);
        } finally {
          setLoadingSlots(false);
        }
      }
      fetchSlots();
    }
  }, [step, selectedCentreId, slotDate]);

  // Auto-switch vehicle if selected vehicle capacity is exceeded by entered quantity
  useEffect(() => {
    const qty = parseFloat(estimatedQuantity) || 0;
    if (qty > 0) {
      const selectedV = VEHICLES.find(v => v.type === vehicleType);
      if (selectedV && qty > selectedV.maxCap) {
        const firstValid = VEHICLES.find(v => qty <= v.maxCap);
        if (firstValid) {
          setVehicleType(firstValid.type);
        }
      }
    }
  }, [estimatedQuantity, vehicleType]);

  const handleNextStep1 = (e) => {
    e.preventDefault();
    const qty = parseFloat(estimatedQuantity);
    if (!estimatedQuantity || isNaN(qty) || qty <= 0) {
      setErrorMsg('Please enter a valid estimated quantity in quintals.');
      return;
    }
    const selectedV = VEHICLES.find(v => v.type === vehicleType);
    if (!selectedV || qty > selectedV.maxCap) {
      setErrorMsg(`Selected vehicle (${vehicleType}) cannot carry ${qty} Qtl. Maximum capacity is ${selectedV?.maxCap || 0} Qtl. Please select a suitable vehicle.`);
      return;
    }
    if (!vehicleNumber.trim()) {
      setErrorMsg('Please enter your vehicle registration number.');
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!selectedCentreId) {
      setErrorMsg('Please select a Mandi Procurement Centre.');
      return;
    }
    setErrorMsg('');
    setStep(3);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlotId) {
      setErrorMsg('Please select a time slot.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await slotsAPI.bookSlot({
        centre_id: selectedCentreId,
        slot_id: selectedSlotId,
        crop_name: cropName,
        crop_variety: cropVariety,
        estimated_quantity_quintals: parseFloat(estimatedQuantity),
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber.toUpperCase().trim(),
      });

      if (res.data.success) {
        // Trigger celebratory confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        const tokenNum = res.data.booking.token_number;
        setTimeout(() => {
          navigate(`/token/${tokenNum}`);
        }, 800);
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to book slot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCentreObj = centres.find(c => c.id === selectedCentreId);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      
      {/* Wizard Step Progress Header */}
      <div className="mb-8 text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          <Calendar className="w-7 h-7 text-kisan-400" />
          Agricultural Procurement Slot Booking
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Book guaranteed MSP turnaround time with automated QR pass generation
        </p>

        {/* Step Indicator Pills */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 pt-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
            step === 1 ? 'bg-kisan-600 text-white' : step > 1 ? 'bg-kisan-900 text-kisan-300' : 'bg-slate-800 text-slate-500'
          }`}>
            <span>1</span>
            <span className="hidden sm:inline">Crop & Vehicle</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
            step === 2 ? 'bg-kisan-600 text-white' : step > 2 ? 'bg-kisan-900 text-kisan-300' : 'bg-slate-800 text-slate-500'
          }`}>
            <span>2</span>
            <span className="hidden sm:inline">Mandi Selection</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
            step === 3 ? 'bg-kisan-600 text-white' : 'bg-slate-800 text-slate-500'
          }`}>
            <span>3</span>
            <span className="hidden sm:inline">Time Slot</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Crop and Vehicle Form */}
      {step === 1 && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-kisan-600 text-white flex items-center justify-center text-xs">1</span>
            Select Crop & Vehicle Information
          </h2>

          <div className="space-y-4">
            
            {/* Crop Picker Cards */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Crop Type & Variety
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {CROPS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setCropName(c.name);
                      setCropVariety(c.variety);
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      cropName === c.name
                        ? 'bg-kisan-600/20 border-kisan-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-2xl mb-1">{c.icon}</span>
                    <span className="font-bold text-sm text-white">{c.name}</span>
                    <span className="text-[11px] text-emerald-400 font-semibold">{c.msp}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated Quantity Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Estimated Quantity (in Quintals)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={estimatedQuantity}
                    onChange={(e) => setEstimatedQuantity(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-base font-semibold focus:outline-none focus:border-kisan-500"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
                    Quintals (Qtl)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Vehicle Registration Number
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. HR-05-AB-1234"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-base font-mono uppercase focus:outline-none focus:border-kisan-500"
                  required
                />
              </div>
            </div>

            {/* Vehicle Type Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Vehicle Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {VEHICLES.map((v) => {
                  const qty = parseFloat(estimatedQuantity) || 0;
                  const isInsufficient = qty > 0 && qty > v.maxCap;
                  const isSelected = vehicleType === v.type && !isInsufficient;

                  return (
                    <button
                      key={v.type}
                      type="button"
                      disabled={isInsufficient}
                      onClick={() => !isInsufficient && setVehicleType(v.type)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isInsufficient
                          ? 'opacity-35 bg-slate-950/40 border-slate-800 text-slate-500 cursor-not-allowed'
                          : isSelected
                          ? 'bg-kisan-600/20 border-kisan-500 text-white shadow-md'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{v.icon}</span>
                        {isInsufficient && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Max {v.maxCap} Qtl
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-xs text-white mt-1">{v.type}</p>
                      <p className={`text-[10px] ${isInsufficient ? 'text-rose-400 font-medium' : 'text-slate-400'}`}>
                        {isInsufficient ? 'Cap exceeded' : v.capacity}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleNextStep1}
              className="px-6 py-3 rounded-xl bg-kisan-600 hover:bg-kisan-500 text-white font-bold text-sm flex items-center gap-2 transition-all"
            >
              Continue to Mandi Selection
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Mandi Selection & AI Matching */}
      {step === 2 && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-kisan-600 text-white flex items-center justify-center text-xs">2</span>
              Select Procurement Mandi
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" /> AI Traffic Optimized
            </div>
          </div>

          {loadingAi ? (
            <div className="py-10 text-center space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
              <p className="text-xs text-slate-400">Evaluating nearby Mandi congestion and queue throughput...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {centres.map((c) => {
                const aiRec = aiRecommendations.find(r => r.centre_id === c.id);
                const isSelected = selectedCentreId === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCentreId(c.id)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-kisan-950/40 border-kisan-500 shadow-xl shadow-kisan-600/10 ring-1 ring-kisan-500'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {c.code}
                      </span>
                      {aiRec && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          aiRec.recommendation_score >= 80
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {aiRec.ai_tag}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-white text-base">{c.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      {c.district}, {c.state}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Current Queue:</span>
                        <span className="font-bold text-white">{c.active_in_queue_count} Trucks</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Est. Processing:</span>
                        <span className="font-bold text-amber-400">~{c.avg_wait_minutes} mins</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleNextStep2}
              className="px-6 py-3 rounded-xl bg-kisan-600 hover:bg-kisan-500 text-white font-bold text-sm flex items-center gap-2 transition-all"
            >
              Pick Time Slot
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Time Slot Selection & Confirmation */}
      {step === 3 && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-kisan-600 text-white flex items-center justify-center text-xs">3</span>
              Select Date & Time Window
            </h2>
            <span className="text-xs text-kisan-400 font-semibold">
              {selectedCentreObj?.name}
            </span>
          </div>

          {/* Date Picker Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Procurement Date
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
                    onClick={() => setSlotDate(dStr)}
                    className={`px-4 py-2.5 rounded-xl border text-center flex flex-col items-center min-w-[90px] transition-all ${
                      slotDate === dStr
                        ? 'bg-kisan-600 text-white border-kisan-500 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold">{dayName}</span>
                    <span className="text-[11px] opacity-80">{dateNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Available Slots Grid */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Available 2-Hour Time Slots
            </label>
            {loadingSlots ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading slot capacity...</div>
            ) : availableSlots.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 text-center text-xs text-slate-400">
                No slots found for this date.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {availableSlots.map((s) => {
                  const isSelected = selectedSlotId === s.id;
                  const isFull = !s.is_bookable;
                  const isPast = s.is_past;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={isFull}
                      onClick={() => setSelectedSlotId(s.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        isFull
                          ? 'opacity-40 bg-slate-950 border-slate-800 cursor-not-allowed'
                          : isSelected
                          ? 'bg-kisan-600/30 border-kisan-400 ring-1 ring-kisan-400 text-white'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-sm text-white flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-kisan-400" />
                          {s.start_time} - {s.end_time}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isPast ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                          s.congestion_color === 'GREEN' ? 'bg-emerald-500/20 text-emerald-300' :
                          s.congestion_color === 'YELLOW' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-rose-500/20 text-rose-300'
                        }`}>
                          {isPast ? 'Slot Ended' : `${s.occupancy_percentage}% Full`}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
                        <span>{isPast ? 'Status:' : 'Available Tokens:'}</span>
                        <span className="font-semibold text-white">
                          {isPast ? 'Unavailable' : `${s.remaining_tokens} / ${s.max_tokens}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Booking Summary Box */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Booking Summary</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px]">Crop:</span>
                <span className="font-semibold">{cropName} ({estimatedQuantity} Qtl)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Vehicle:</span>
                <span className="font-mono font-semibold">{vehicleNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Mandi:</span>
                <span className="font-semibold truncate">{selectedCentreObj?.name || 'Selected Mandi'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Date:</span>
                <span className="font-semibold">{slotDate}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleConfirmBooking}
              disabled={loading || !selectedSlotId}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-kisan-600 to-kisan-500 hover:from-kisan-500 hover:to-kisan-400 text-white font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-kisan-600/30 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Digital Pass...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Confirm & Get Digital Pass
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
