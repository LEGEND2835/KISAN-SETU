import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Building2, 
  Calendar, 
  TrendingUp, 
  Search, 
  Plus, 
  Edit3, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  RefreshCw, 
  Layers, 
  Phone, 
  MapPin, 
  Clock, 
  IndianRupee, 
  ArrowRight, 
  Activity,
  Truck,
  Sparkles,
  Lock,
  Filter,
  Check,
  X,
  FileText,
  BadgeAlert,
  Power
} from 'lucide-react';
import { adminAPI, centresAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { INDIAN_STATES, getDistrictsForState } from '../../utils/indianStatesAndDistricts';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();

  // Active Tab: 'OVERVIEW' | 'FARMERS' | 'OFFICERS' | 'MANDIS' | 'SLOTS'
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // 1. Overview State
  const [overviewStats, setOverviewStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  // 2. Farmers State
  const [farmers, setFarmers] = useState([]);
  const [farmerSearch, setFarmerSearch] = useState('');
  const [farmerStateFilter, setFarmerStateFilter] = useState('');
  const [selectedFarmerForView, setSelectedFarmerForView] = useState(null);
  const [selectedFarmerForEdit, setSelectedFarmerForEdit] = useState(null);
  const [farmerEditForm, setFarmerEditForm] = useState({});

  // 3. Officers & Staff State
  const [officers, setOfficers] = useState([]);
  const [officerRoleFilter, setOfficerRoleFilter] = useState('ALL');
  const [showAddOfficerModal, setShowAddOfficerModal] = useState(false);
  const [selectedOfficerForEdit, setSelectedOfficerForEdit] = useState(null);
  const [officerForm, setOfficerForm] = useState({
    full_name: '',
    phone: '',
    role: 'centre_officer',
    password: '',
    designation: 'Mandi Supervisor',
    centre_id: '',
    state: 'Haryana',
    district: 'Karnal',
  });

  // 4. Mandis State
  const [centres, setCentres] = useState([]);
  const [showAddCentreModal, setShowAddCentreModal] = useState(false);
  const [selectedCentreForEdit, setSelectedCentreForEdit] = useState(null);
  const [centreForm, setCentreForm] = useState({
    name: '',
    code: '',
    state: 'Haryana',
    district: 'Karnal',
    address: '',
    daily_capacity_quintals: 8000,
    max_concurrent_trucks: 16,
    supported_crops: ['Wheat', 'Paddy (Basmati)', 'Mustard', 'Gram'],
    contact_phone: '0184-225588',
    operating_hours: '08:00 AM - 06:00 PM',
    latitude: 29.6857,
    longitude: 76.9905,
    is_active: true,
  });

  // 5. Slots State
  const [selectedSlotCentreId, setSelectedSlotCentreId] = useState('');
  const [slotDate, setSlotDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [centreSlots, setCentreSlots] = useState([]);
  const [selectedSlotForEdit, setSelectedSlotForEdit] = useState(null);
  const [slotEditForm, setSlotEditForm] = useState({
    max_capacity_quintals: 1500,
    max_tokens: 25,
    status: 'OPEN',
  });

  // Load Overview Data
  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getOverview();
      if (res.data.success) {
        setOverviewStats(res.data.stats);
        setRecentActivity(res.data.recent_activity || []);
      }
    } catch (err) {
      console.error('Failed to load overview stats:', err);
      showFeedback('error', 'Failed to load system overview statistics.');
    } finally {
      setLoading(false);
    }
  };

  // Load Farmers
  const loadFarmers = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getFarmers({
        q: farmerSearch.trim() || undefined,
        state: farmerStateFilter || undefined,
      });
      if (res.data.success) {
        setFarmers(res.data.farmers);
      }
    } catch (err) {
      console.error('Failed to load farmers:', err);
      showFeedback('error', 'Failed to load farmer directory.');
    } finally {
      setLoading(false);
    }
  };

  // Load Officers
  const loadOfficers = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getOfficers();
      if (res.data.success) {
        setOfficers(res.data.officers);
      }
    } catch (err) {
      console.error('Failed to load officers:', err);
      showFeedback('error', 'Failed to load officers directory.');
    } finally {
      setLoading(false);
    }
  };

  // Load Mandis
  const loadCentres = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getCentres();
      if (res.data.success) {
        setCentres(res.data.centres);
        if (!selectedSlotCentreId && res.data.centres.length > 0) {
          setSelectedSlotCentreId(res.data.centres[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load centres:', err);
      showFeedback('error', 'Failed to load Mandi centres.');
    } finally {
      setLoading(false);
    }
  };

  // Load Slots
  const loadSlots = async () => {
    if (!selectedSlotCentreId) return;
    try {
      setLoading(true);
      const res = await adminAPI.getSlots(selectedSlotCentreId, { date: slotDate });
      if (res.data.success) {
        setCentreSlots(res.data.slots);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
      showFeedback('error', 'Failed to retrieve slot configuration.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger loads based on active tab
  useEffect(() => {
    if (activeTab === 'OVERVIEW') loadOverview();
    else if (activeTab === 'FARMERS') loadFarmers();
    else if (activeTab === 'OFFICERS') loadOfficers();
    else if (activeTab === 'MANDIS') loadCentres();
    else if (activeTab === 'SLOTS') {
      loadCentres();
      loadSlots();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'SLOTS' && selectedSlotCentreId) {
      loadSlots();
    }
  }, [selectedSlotCentreId, slotDate]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 5000);
  };

  // Handle Farmer Edit Save
  const handleSaveFarmerEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await adminAPI.updateFarmer(selectedFarmerForEdit.id, farmerEditForm);
      if (res.data.success) {
        showFeedback('success', res.data.message || 'Farmer details updated successfully.');
        setSelectedFarmerForEdit(null);
        loadFarmers();
      }
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to update farmer details.');
    }
  };

  // View Single Farmer Details
  const handleViewFarmer = async (farmerId) => {
    try {
      const res = await adminAPI.getFarmerById(farmerId);
      if (res.data.success) {
        setSelectedFarmerForView(res.data);
      }
    } catch (err) {
      showFeedback('error', 'Failed to retrieve farmer history.');
    }
  };

  // Handle Add Officer
  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    try {
      const res = await adminAPI.createOfficer(officerForm);
      if (res.data.success) {
        showFeedback('success', res.data.message || 'Staff member created successfully.');
        setShowAddOfficerModal(false);
        setOfficerForm({
          full_name: '',
          phone: '',
          role: 'centre_officer',
          password: '',
          designation: 'Mandi Supervisor',
          centre_id: '',
          state: 'Haryana',
          district: 'Karnal',
        });
        loadOfficers();
      }
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to create officer account.');
    }
  };

  // Handle Officer Edit Save
  const handleSaveOfficerEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await adminAPI.updateOfficer(selectedOfficerForEdit.id, officerForm);
      if (res.data.success) {
        showFeedback('success', res.data.message || 'Officer updated successfully.');
        setSelectedOfficerForEdit(null);
        loadOfficers();
      }
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to update officer.');
    }
  };

  // Handle Add Mandi Hub
  const handleCreateCentre = async (e) => {
    e.preventDefault();
    try {
      const res = await adminAPI.createCentre(centreForm);
      if (res.data.success) {
        showFeedback('success', res.data.message || 'Mandi Hub added successfully.');
        setShowAddCentreModal(false);
        setCentreForm({
          name: '',
          code: '',
          state: 'Haryana',
          district: 'Karnal',
          address: '',
          daily_capacity_quintals: 8000,
          max_concurrent_trucks: 16,
          supported_crops: ['Wheat', 'Paddy (Basmati)', 'Mustard', 'Gram'],
          contact_phone: '0184-225588',
          operating_hours: '08:00 AM - 06:00 PM',
          latitude: 29.6857,
          longitude: 76.9905,
          is_active: true,
        });
        loadCentres();
      }
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to create Mandi Hub.');
    }
  };

  // Handle Edit Mandi Hub
  const handleSaveCentreEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await adminAPI.updateCentre(selectedCentreForEdit.id, centreForm);
      if (res.data.success) {
        showFeedback('success', res.data.message || 'Mandi details updated successfully.');
        setSelectedCentreForEdit(null);
        loadCentres();
      }
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to update Mandi details.');
    }
  };

  // Toggle Mandi Active/Inactive Status
  const handleToggleCentreStatus = async (centre) => {
    try {
      const newStatus = !centre.is_active;
      const res = await adminAPI.updateCentre(centre.id, { is_active: newStatus });
      if (res.data.success) {
        showFeedback('success', `Mandi "${centre.name}" is now ${newStatus ? 'OPERATIONAL' : 'DEACTIVATED'}.`);
        loadCentres();
      }
    } catch (err) {
      showFeedback('error', 'Failed to toggle Mandi status.');
    }
  };

  // Handle Save Slot Edit
  const handleSaveSlotEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await adminAPI.updateSlot(selectedSlotForEdit.id, slotEditForm);
      if (res.data.success) {
        showFeedback('success', 'Slot limits & status updated successfully.');
        setSelectedSlotForEdit(null);
        loadSlots();
      }
    } catch (err) {
      showFeedback('error', 'Failed to update slot settings.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* Top Header & Platform Badge */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              NATIONAL SUPER-ADMIN CONTROL PANEL
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              • Ministry of Agriculture & Farmers Welfare Authority
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>KisanSetu Governance Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Centralized administration for Farmers, Mandi Staff, Procurement Yards, Slot Capacity, and DBT Payout Audits.
          </p>
        </div>

        {/* User Info / Refresh */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-right hidden sm:block">
            <p className="text-xs font-bold text-white leading-tight">{user?.full_name || 'Dr. Vikram Sarabhai'}</p>
            <p className="text-[10px] text-amber-400 font-semibold">{user?.designation || 'National Procurement Director'}</p>
          </div>
          <button
            onClick={() => {
              if (activeTab === 'OVERVIEW') loadOverview();
              else if (activeTab === 'FARMERS') loadFarmers();
              else if (activeTab === 'OFFICERS') loadOfficers();
              else if (activeTab === 'MANDIS') loadCentres();
              else if (activeTab === 'SLOTS') loadSlots();
            }}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors shadow-sm"
            title="Refresh Current View"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback.message && (
        <div className={`p-4 rounded-2xl border text-sm flex items-center justify-between gap-3 animate-fade-in ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' 
            : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback({ type: '', message: '' })} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/80">
        {[
          { id: 'OVERVIEW', label: 'Overview & KPIs', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'FARMERS', label: 'Farmers Directory', icon: <Users className="w-4 h-4" /> },
          { id: 'OFFICERS', label: 'Officers & Staff', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'MANDIS', label: 'Mandi Centres Hub', icon: <Building2 className="w-4 h-4" /> },
          { id: 'SLOTS', label: 'Slot Capacity & Timings', icon: <Clock className="w-4 h-4" /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-all shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 ring-1 ring-amber-300 font-extrabold scale-[1.02]'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: SYSTEM OVERVIEW & METRICS                          */}
      {/* ========================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Top 6 KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider block">Registered Farmers</span>
              <p className="text-2xl sm:text-3xl font-black text-white font-mono">{overviewStats?.total_farmers || 0}</p>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">● Verified KYC</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider block">Active Officers</span>
              <p className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">{overviewStats?.total_officers || 0}</p>
              <span className="text-[10px] text-slate-500 font-medium">Across all Mandis</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider block">Procurement Mandis</span>
              <p className="text-2xl sm:text-3xl font-black text-sky-400 font-mono">{overviewStats?.total_centres || 0}</p>
              <span className="text-[10px] text-emerald-400 font-medium">{overviewStats?.active_centres || 0} Operational</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider block">Total Bookings</span>
              <p className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">{overviewStats?.total_bookings || 0}</p>
              <span className="text-[10px] text-slate-500 font-medium">Digital Passes</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider block">Total Procured</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">{(overviewStats?.total_procured_quintals || 0).toLocaleString('en-IN')}</p>
              <span className="text-[10px] text-slate-400 font-medium">Quintals</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider block">DBT Payout Ledger</span>
              <p className="text-xl sm:text-2xl font-black text-amber-300 font-mono truncate">₹{(overviewStats?.total_dbt_payout || 0).toLocaleString('en-IN')}</p>
              <span className="text-[10px] text-emerald-400 font-medium">100% MSP Rate</span>
            </div>
          </div>

          {/* Quick Management Shortcuts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => {
                setActiveTab('MANDIS');
                setShowAddCentreModal(true);
              }}
              className="p-5 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 shadow-sm dark:shadow-none text-left transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Add New Mandi Centre</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure yard capacity, truck bays, and auto 7-day slot generation.</p>
            </button>

            <button
              onClick={() => {
                setActiveTab('OFFICERS');
                setShowAddOfficerModal(true);
              }}
              className="p-5 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 shadow-sm dark:shadow-none text-left transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Register Officer / Staff</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Onboard supervisors, lab quality analysts, and weighbridge operators.</p>
            </button>

            <button
              onClick={() => setActiveTab('FARMERS')}
              className="p-5 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 hover:border-sky-500/50 shadow-sm dark:shadow-none text-left transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Search Farmer Directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Inspect KYC profiles, registered Aadhaar, IFSC accounts & sales.</p>
            </button>

            <button
              onClick={() => setActiveTab('SLOTS')}
              className="p-5 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 shadow-sm dark:shadow-none text-left transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Configure Slot Capacity</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Adjust 2-hour window quotas, pause booking, or set holiday blackouts.</p>
            </button>
          </div>

          {/* Recent System Audit Activity Stream */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-400" />
                Live System Audit Feed & Realtime Queue Events
              </h3>
              <span className="text-xs text-slate-400 font-mono">Realtime Postgres / Sockets Stream</span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {recentActivity.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">No recent queue events logged yet.</div>
              ) : (
                recentActivity.map((log, idx) => (
                  <div key={log.id || idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {log.token_number || 'SYSTEM'}
                      </span>
                      <span className="text-slate-300">
                        Transitioned from <strong className="text-slate-400">{log.from_status}</strong> to <strong className="text-emerald-400">{log.to_status}</strong>
                      </span>
                      {log.station && (
                        <span className="text-slate-500 hidden md:inline">({log.station})</span>
                      )}
                    </div>
                    <div className="text-slate-500 font-mono text-[11px] shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: FARMERS DIRECTORY & PROFILE MANAGEMENT             */}
      {/* ========================================================= */}
      {activeTab === 'FARMERS' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Search & Filter Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={farmerSearch}
                onChange={(e) => setFarmerSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadFarmers()}
                placeholder="Search by name, mobile, district or village..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={farmerStateFilter}
                onChange={(e) => setFarmerStateFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">All States</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <button
                onClick={loadFarmers}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
              >
                <Search className="w-3.5 h-3.5" /> Search
              </button>
            </div>
          </div>

          {/* Farmers Table */}
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Farmer Details</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">KYC / Bank Details</th>
                    <th className="py-3.5 px-4 text-center">Procurement Passes</th>
                    <th className="py-3.5 px-4 text-center">Total Sold (Qtl)</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {farmers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500">
                        No farmer profiles matching the search filter.
                      </td>
                    </tr>
                  ) : (
                    farmers.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-white text-sm">{f.full_name}</p>
                          <p className="text-slate-400 font-mono text-[11px]">+91 {f.phone}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-slate-200">{f.village ? `${f.village}, ` : ''}{f.district}</p>
                          <p className="text-slate-400 text-[11px]">{f.state}</p>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <p className="text-slate-300">Aadhaar: •••• {f.aadhaar_last4 || 'XXXX'}</p>
                          <p className="text-slate-400">A/C: •••• {f.bank_account_last4 || 'XXXX'} ({f.ifsc_code || 'SBIN'})</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                            {f.total_bookings} Passes
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-400 font-mono">
                          {f.total_sold_quintals} Qtl
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewFarmer(f.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              title="View History"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedFarmerForEdit(f);
                                setFarmerEditForm({ ...f });
                              }}
                              className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-colors"
                              title="Edit Farmer Details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: OFFICERS & STAFF DIRECTORY                         */}
      {/* ========================================================= */}
      {activeTab === 'OFFICERS' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {['ALL', 'centre_officer', 'quality_inspector', 'weighbridge_operator', 'admin'].map((r) => (
                <button
                  key={r}
                  onClick={() => setOfficerRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    officerRoleFilter === r
                      ? 'bg-amber-500 text-slate-950 font-extrabold'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {r === 'ALL' ? 'All Roles' : r.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setOfficerForm({
                  full_name: '',
                  phone: '',
                  role: 'centre_officer',
                  password: '',
                  designation: 'Mandi Supervisor',
                  centre_id: centres[0]?.id || '',
                  state: 'Haryana',
                  district: 'Karnal',
                });
                setShowAddOfficerModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 shrink-0"
            >
              <Plus className="w-4 h-4" /> Register New Officer / Staff
            </button>
          </div>

          {/* Officers Table */}
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Role & Designation</th>
                    <th className="py-3.5 px-4">Assigned Mandi Hub</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {officers
                    .filter(o => officerRoleFilter === 'ALL' || o.role === officerRoleFilter)
                    .map((o) => (
                      <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-white text-sm">{o.full_name}</p>
                          <p className="text-slate-400 text-[11px]">{o.email || `${o.phone}@kisansetu.gov.in`}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            o.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                            o.role === 'centre_officer' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                            o.role === 'quality_inspector' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                            'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          }`}>
                            {o.role.replace('_', ' ')}
                          </span>
                          <p className="text-slate-300 text-[11px] mt-0.5">{o.designation}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-white">{o.centre_name || 'All Mandis (HQ)'}</p>
                          <p className="text-slate-400 text-[11px] font-mono">{o.centre_code || 'MND-ALL'}</p>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          +91 {o.phone}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedOfficerForEdit(o);
                              setOfficerForm({
                                full_name: o.full_name,
                                phone: o.phone,
                                role: o.role,
                                designation: o.designation || '',
                                centre_id: o.centre_id || '',
                                state: o.state || 'Haryana',
                                district: o.district || 'Karnal',
                              });
                            }}
                            className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-colors"
                            title="Edit Officer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: MANDI CENTRES MANAGEMENT                           */}
      {/* ========================================================= */}
      {activeTab === 'MANDIS' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white">Registered Agricultural Procurement Mandis</h2>
              <p className="text-xs text-slate-400">Manage yard facilities, daily intake limits, concurrent truck bays, and crop support.</p>
            </div>

            <button
              onClick={() => {
                setCentreForm({
                  name: '',
                  code: '',
                  state: 'Haryana',
                  district: 'Karnal',
                  address: '',
                  daily_capacity_quintals: 8000,
                  max_concurrent_trucks: 16,
                  supported_crops: ['Wheat', 'Paddy (Basmati)', 'Mustard', 'Gram'],
                  contact_phone: '0184-225588',
                  operating_hours: '08:00 AM - 06:00 PM',
                  latitude: 29.6857,
                  longitude: 76.9905,
                  is_active: true,
                });
                setShowAddCentreModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 shrink-0"
            >
              <Plus className="w-4 h-4" /> Add New Mandi Hub
            </button>
          </div>

          {/* Mandis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {centres.map((c) => {
              const crops = Array.isArray(c.supported_crops) ? c.supported_crops : [];
              return (
                <div
                  key={c.id}
                  className={`glass-panel rounded-3xl p-6 border transition-all relative overflow-hidden flex flex-col justify-between space-y-4 ${
                    c.is_active !== false ? 'border-slate-800 hover:border-slate-700' : 'border-rose-500/30 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                        {c.code}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.is_active !== false ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {c.is_active !== false ? 'OPERATIONAL' : 'DEACTIVATED'}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-black text-white text-lg">{c.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      {c.address}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Daily Capacity:</span>
                        <span className="font-bold text-white font-mono">{c.daily_capacity_quintals} Qtl</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Truck Bays:</span>
                        <span className="font-bold text-amber-300 font-mono">{c.max_concurrent_trucks || 12} Trucks</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Operating Hours:</span>
                        <span className="font-semibold text-slate-200 text-[11px]">{c.operating_hours || '08 AM - 06 PM'}</span>
                      </div>
                    </div>

                    {/* Supported Crops */}
                    <div className="mt-3">
                      <span className="text-[10px] text-slate-500 block mb-1">Supported Commodities:</span>
                      <div className="flex flex-wrap gap-1">
                        {crops.map(crop => (
                          <span key={crop} className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] text-slate-300">
                            🌾 {crop}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggleCentreStatus(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                        c.is_active !== false 
                          ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30' 
                          : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {c.is_active !== false ? 'Deactivate Mandi' : 'Activate Mandi'}
                    </button>

                    <button
                      onClick={() => {
                        setSelectedCentreForEdit(c);
                        setCentreForm({
                          name: c.name,
                          code: c.code,
                          state: c.state,
                          district: c.district,
                          address: c.address,
                          daily_capacity_quintals: c.daily_capacity_quintals,
                          max_concurrent_trucks: c.max_concurrent_trucks,
                          supported_crops: Array.isArray(c.supported_crops) ? c.supported_crops : ['Wheat', 'Paddy'],
                          contact_phone: c.contact_phone || '0184-225588',
                          operating_hours: c.operating_hours || '08:00 AM - 06:00 PM',
                          latitude: c.latitude || 29.6857,
                          longitude: c.longitude || 76.9905,
                          is_active: c.is_active !== false,
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: SLOT CAPACITY & TIMINGS CONFIGURATION              */}
      {/* ========================================================= */}
      {activeTab === 'SLOTS' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mandi Centre</label>
                <select
                  value={selectedSlotCentreId}
                  onChange={(e) => setSelectedSlotCentreId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                >
                  {centres.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Procurement Date</label>
                <input
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              onClick={loadSlots}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Slots
            </button>
          </div>

          {/* Slots Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {centreSlots.length === 0 ? (
              <div className="col-span-3 py-12 text-center text-slate-500 text-xs">
                No slots configured for this date.
              </div>
            ) : (
              centreSlots.map((s) => {
                const bookedTokens = parseInt(s.booked_tokens || '0', 10);
                const maxTokens = parseInt(s.max_tokens || '25', 10);
                const pct = Math.min(100, Math.round((bookedTokens / maxTokens) * 100));

                return (
                  <div key={s.id} className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-400" />
                        {s.start_time} - {s.end_time}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === 'OPEN' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        s.status === 'PAUSED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {s.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Tokens Booked:</span>
                        <span className="font-bold text-white font-mono">{bookedTokens} / {maxTokens}</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full ${
                            pct >= 80 ? 'bg-rose-500' : pct >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs pt-2 border-t border-slate-800/80">
                      <span className="text-slate-400">Capacity Limit:</span>
                      <span className="font-bold text-white font-mono">{s.max_capacity_quintals} Qtl</span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedSlotForEdit(s);
                        setSlotEditForm({
                          max_capacity_quintals: s.max_capacity_quintals,
                          max_tokens: s.max_tokens,
                          status: s.status,
                        });
                      }}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Adjust Capacity & Status
                    </button>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS SECTION                                            */}
      {/* ========================================================= */}

      {/* 1. Modal: Edit Farmer Profile */}
      {selectedFarmerForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                Edit Farmer Profile
              </h3>
              <button onClick={() => setSelectedFarmerForEdit(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFarmerEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={farmerEditForm.full_name || ''}
                  onChange={(e) => setFarmerEditForm({ ...farmerEditForm, full_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={farmerEditForm.phone || ''}
                    onChange={(e) => setFarmerEditForm({ ...farmerEditForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Village / Address</label>
                  <input
                    type="text"
                    value={farmerEditForm.village || ''}
                    onChange={(e) => setFarmerEditForm({ ...farmerEditForm, village: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    value={farmerEditForm.state || ''}
                    onChange={(e) => setFarmerEditForm({ ...farmerEditForm, state: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">District</label>
                  <input
                    type="text"
                    value={farmerEditForm.district || ''}
                    onChange={(e) => setFarmerEditForm({ ...farmerEditForm, district: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Aadhaar Last 4</label>
                  <input
                    type="text"
                    maxLength="4"
                    value={farmerEditForm.aadhaar_last4 || ''}
                    onChange={(e) => setFarmerEditForm({ ...farmerEditForm, aadhaar_last4: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Bank A/C Last 4</label>
                  <input
                    type="text"
                    maxLength="4"
                    value={farmerEditForm.bank_account_last4 || ''}
                    onChange={(e) => setFarmerEditForm({ ...farmerEditForm, bank_account_last4: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={farmerEditForm.ifsc_code || ''}
                    onChange={(e) => setFarmerEditForm({ ...farmerEditForm, ifsc_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFarmerForEdit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: View Farmer Full History */}
      {selectedFarmerForView && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-5 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">{selectedFarmerForView.farmer.full_name}</h3>
                <p className="text-xs text-slate-400 font-mono">+91 {selectedFarmerForView.farmer.phone} • {selectedFarmerForView.farmer.district}, {selectedFarmerForView.farmer.state}</p>
              </div>
              <button onClick={() => setSelectedFarmerForView(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Procurement Passes & History ({selectedFarmerForView.bookings?.length || 0})</h4>
              <div className="space-y-2">
                {selectedFarmerForView.bookings?.length === 0 ? (
                  <p className="text-slate-500 py-4 text-center">No bookings on record for this farmer.</p>
                ) : (
                  selectedFarmerForView.bookings.map(b => (
                    <div key={b.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded mr-2">
                          {b.token_number}
                        </span>
                        <span className="font-semibold text-white">{b.crop_name}</span>
                        <span className="text-slate-400 text-[11px] ml-1">({b.estimated_quantity_quintals} Qtl)</span>
                        <p className="text-[11px] text-slate-500 mt-1">{b.centre_name} • {b.slot_date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {b.status}
                        </span>
                        {b.net_payable_amount > 0 && (
                          <p className="text-emerald-400 font-bold font-mono text-[11px] mt-1">₹{parseFloat(b.net_payable_amount).toLocaleString('en-IN')}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedFarmerForView(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Add / Edit Officer */}
      {(showAddOfficerModal || selectedOfficerForEdit) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                {showAddOfficerModal ? 'Register New Staff Member' : 'Edit Staff Member'}
              </h3>
              <button 
                onClick={() => {
                  setShowAddOfficerModal(false);
                  setSelectedOfficerForEdit(null);
                }} 
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={showAddOfficerModal ? handleCreateOfficer : handleSaveOfficerEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={officerForm.full_name}
                  onChange={(e) => setOfficerForm({ ...officerForm, full_name: e.target.value })}
                  placeholder="Rajesh Sharma"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={officerForm.phone}
                    onChange={(e) => setOfficerForm({ ...officerForm, phone: e.target.value })}
                    placeholder="9876543220"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Role Type</label>
                  <select
                    value={officerForm.role}
                    onChange={(e) => setOfficerForm({ ...officerForm, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="centre_officer">Mandi Supervisor</option>
                    <option value="quality_inspector">Quality Inspector</option>
                    <option value="weighbridge_operator">Weighbridge Operator</option>
                    <option value="admin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Designation Title</label>
                  <input
                    type="text"
                    value={officerForm.designation}
                    onChange={(e) => setOfficerForm({ ...officerForm, designation: e.target.value })}
                    placeholder="Mandi Supervisor"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Assigned Mandi Hub</label>
                  <select
                    value={officerForm.centre_id || ''}
                    onChange={(e) => setOfficerForm({ ...officerForm, centre_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">All Mandis / HQ</option>
                    {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {showAddOfficerModal && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Temporary Password</label>
                  <input
                    type="password"
                    value={officerForm.password}
                    onChange={(e) => setOfficerForm({ ...officerForm, password: e.target.value })}
                    placeholder="Set temporary password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddOfficerModal(false);
                    setSelectedOfficerForEdit(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {showAddOfficerModal ? 'Register Staff' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Add / Edit Mandi Centre */}
      {(showAddCentreModal || selectedCentreForEdit) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-5 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                {showAddCentreModal ? 'Add New Mandi Procurement Centre' : 'Edit Mandi Details'}
              </h3>
              <button 
                onClick={() => {
                  setShowAddCentreModal(false);
                  setSelectedCentreForEdit(null);
                }} 
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={showAddCentreModal ? handleCreateCentre : handleSaveCentreEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Mandi Name</label>
                  <input
                    type="text"
                    value={centreForm.name}
                    onChange={(e) => setCentreForm({ ...centreForm, name: e.target.value })}
                    placeholder="Ambala Agro Procurement Terminal"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Code (e.g. MND-AMB-01)</label>
                  <input
                    type="text"
                    value={centreForm.code}
                    onChange={(e) => setCentreForm({ ...centreForm, code: e.target.value.toUpperCase() })}
                    placeholder="MND-AMB-01"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Address & Location</label>
                <input
                  type="text"
                  value={centreForm.address}
                  onChange={(e) => setCentreForm({ ...centreForm, address: e.target.value })}
                  placeholder="Main APMC Yard, GT Road, Ambala, Haryana 133001"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    value={centreForm.state}
                    onChange={(e) => setCentreForm({ ...centreForm, state: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">District</label>
                  <input
                    type="text"
                    value={centreForm.district}
                    onChange={(e) => setCentreForm({ ...centreForm, district: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Daily Cap (Qtl)</label>
                  <input
                    type="number"
                    value={centreForm.daily_capacity_quintals}
                    onChange={(e) => setCentreForm({ ...centreForm, daily_capacity_quintals: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Truck Bays</label>
                  <input
                    type="number"
                    value={centreForm.max_concurrent_trucks}
                    onChange={(e) => setCentreForm({ ...centreForm, max_concurrent_trucks: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={centreForm.contact_phone}
                    onChange={(e) => setCentreForm({ ...centreForm, contact_phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Operating Hours</label>
                <input
                  type="text"
                  value={centreForm.operating_hours}
                  onChange={(e) => setCentreForm({ ...centreForm, operating_hours: e.target.value })}
                  placeholder="08:00 AM - 06:00 PM"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCentreModal(false);
                    setSelectedCentreForEdit(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  {showAddCentreModal ? 'Create Mandi Hub' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Edit Slot Capacity & Limits */}
      {selectedSlotForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Adjust Slot Window ({selectedSlotForEdit.start_time} - {selectedSlotForEdit.end_time})
              </h3>
              <button onClick={() => setSelectedSlotForEdit(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlotEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Max Capacity (Quintals)</label>
                <input
                  type="number"
                  value={slotEditForm.max_capacity_quintals}
                  onChange={(e) => setSlotEditForm({ ...slotEditForm, max_capacity_quintals: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Max Token Passes</label>
                <input
                  type="number"
                  value={slotEditForm.max_tokens}
                  onChange={(e) => setSlotEditForm({ ...slotEditForm, max_tokens: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Slot Window Status</label>
                <select
                  value={slotEditForm.status}
                  onChange={(e) => setSlotEditForm({ ...slotEditForm, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="OPEN">OPEN (Accepting Bookings)</option>
                  <option value="PAUSED">PAUSED (Temporarily Halt)</option>
                  <option value="CLOSED">CLOSED (Full / Blackout)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSlotForEdit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Update Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
