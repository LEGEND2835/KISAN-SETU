import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  Briefcase, 
  Building2, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Edit3, 
  PlusCircle, 
  X,
  Truck,
  ShieldCheck,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { authAPI, centresAPI } from '../../services/api';
import { INDIAN_STATES, getDistrictsForState } from '../../utils/indianStatesAndDistricts';
import { CROPS_CATALOG, getCropName } from '../../utils/cropsData';

export default function Profile() {
  const { user, updateUserSession, isStaff } = useAuth();
  const { lang, t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Common Profile State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [state, setState] = useState('Haryana');
  const [district, setDistrict] = useState('Karnal');
  const [address, setAddress] = useState('');

  // Farmer Specific: Crop Portfolio
  const [crops, setCrops] = useState([]);
  const [selectedCropToAdd, setSelectedCropToAdd] = useState('wheat');

  // Officer Specific: Designation & Assigned Centre
  const [designation, setDesignation] = useState('');
  const [centreId, setCentreId] = useState('');

  // Mandi Administration State
  const [centresList, setCentresList] = useState([]);
  const [loadingCentres, setLoadingCentres] = useState(false);
  const [mandiModalOpen, setMandiModalOpen] = useState(false);
  const [editingMandiId, setEditingMandiId] = useState(null);
  const [mandiForm, setMandiForm] = useState({
    name: '',
    state: 'Haryana',
    district: 'Karnal',
    address: '',
    contact_phone: '',
    operating_hours: '08:00 AM - 06:00 PM',
    daily_capacity_quintals: 1000,
  });
  const [mandiSaving, setMandiSaving] = useState(false);
  const [mandiError, setMandiError] = useState('');
  const [mandiSuccess, setMandiSuccess] = useState('');

  // Fetch logged in profile details
  useEffect(() => {
    async function loadProfile() {
      setFetchingProfile(true);
      try {
        const res = await authAPI.getMe();
        if (res.data.success && res.data.user) {
          const u = res.data.user;
          setFullName(u.full_name || '');
          setPhone(u.phone || '');
          setEmail(u.email || '');
          setDob(u.dob ? u.dob.split('T')[0] : '');
          setState(u.state || 'Haryana');
          setDistrict(u.district || 'Karnal');
          setAddress(u.address || u.village || '');
          setDesignation(u.designation || '');
          setCentreId(u.centre_id || '');
          setCrops(Array.isArray(u.crops) ? u.crops : ['wheat', 'mustard']);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setFetchingProfile(false);
      }
    }
    loadProfile();
  }, []);

  // Fetch centres for officer assignment and mandi administration
  const loadCentres = async () => {
    setLoadingCentres(true);
    try {
      const res = await centresAPI.getAll();
      if (res.data.success) {
        setCentresList(res.data.centres || []);
      }
    } catch (err) {
      console.error('Failed to fetch centres:', err);
    } finally {
      setLoadingCentres(false);
    }
  };

  useEffect(() => {
    loadCentres();
  }, []);

  // Update district automatically when state changes
  const handleStateChange = (newState) => {
    setState(newState);
    const districts = getDistrictsForState(newState);
    if (districts.length > 0) {
      setDistrict(districts[0]);
    }
  };

  // Add crop to portfolio
  const handleAddCrop = () => {
    if (!selectedCropToAdd) return;
    if (!crops.includes(selectedCropToAdd)) {
      setCrops([...crops, selectedCropToAdd]);
    }
  };

  // Remove crop from portfolio
  const handleRemoveCrop = (cropKey) => {
    setCrops(crops.filter(c => c !== cropKey));
  };

  // Submit Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const payload = {
        full_name: fullName,
        phone,
        email,
        dob: dob || null,
        state,
        district,
        address,
        crops,
        designation,
        centre_id: centreId || null,
      };

      const res = await authAPI.updateProfile(payload);
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Profile updated successfully!');
        if (res.data.user) {
          updateUserSession(res.data.user, res.data.token);
        }
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      const serverCode = err.response?.data?.code;
      const serverMsg = err.response?.data?.message;
      if (serverCode === 'PHONE_ALREADY_EXISTS' || (serverMsg && serverMsg.toLowerCase().includes('already exists'))) {
        setErrorMsg('Phone number already exists. Please use a different number.');
      } else {
        setErrorMsg(serverMsg || 'Failed to update profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Mandi Admin: Open Create / Edit Modal
  const handleOpenMandiModal = (mandi = null) => {
    setMandiError('');
    setMandiSuccess('');
    if (mandi) {
      setEditingMandiId(mandi.id);
      setMandiForm({
        name: mandi.name,
        state: mandi.state || 'Haryana',
        district: mandi.district || 'Karnal',
        address: mandi.address || '',
        contact_phone: mandi.contact_phone || '',
        operating_hours: mandi.operating_hours || '08:00 AM - 06:00 PM',
        daily_capacity_quintals: mandi.daily_capacity_quintals || 1000,
      });
    } else {
      setEditingMandiId(null);
      setMandiForm({
        name: '',
        state: 'Haryana',
        district: 'Karnal',
        address: '',
        contact_phone: '',
        operating_hours: '08:00 AM - 06:00 PM',
        daily_capacity_quintals: 1000,
      });
    }
    setMandiModalOpen(true);
  };

  // Mandi Admin: Save Mandi (Create or Update)
  const handleSaveMandi = async (e) => {
    e.preventDefault();
    setMandiError('');
    setMandiSuccess('');
    setMandiSaving(true);

    try {
      if (editingMandiId) {
        const res = await centresAPI.update(editingMandiId, mandiForm);
        if (res.data.success) {
          setMandiSuccess('Mandi centre updated successfully!');
          await loadCentres();
          setTimeout(() => {
            setMandiModalOpen(false);
          }, 1000);
        }
      } else {
        const res = await centresAPI.create(mandiForm);
        if (res.data.success) {
          setMandiSuccess('New Mandi centre added and 7-day slots generated successfully!');
          await loadCentres();
          setTimeout(() => {
            setMandiModalOpen(false);
          }, 1200);
        }
      }
    } catch (err) {
      setMandiError(err.response?.data?.message || 'Failed to save Mandi details.');
    } finally {
      setMandiSaving(false);
    }
  };

  const availableDistricts = getDistrictsForState(state);
  const mandiDistricts = getDistrictsForState(mandiForm.state);

  if (fetchingProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-kisan-400 mx-auto" />
        <p className="text-slate-400 text-sm">Loading your account details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fade-in">
      
      {/* Profile Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-kisan-950/50 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-kisan-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-kisan-600/30 ring-2 ring-kisan-400/40">
              {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {fullName || 'User Profile'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-kisan-500/20 text-kisan-300 border border-kisan-500/30">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>+91 {phone}</span>
                {email && <span>• {email}</span>}
                <span>• {district}, {state}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Verified KisanSetu Account</span>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Profile Form Grid */}
      <form onSubmit={handleSaveProfile} className="space-y-8">
        
        {/* SECTION 1: Personal & Contact Information */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-kisan-400" />
              Personal & Contact Information
            </h2>
            <span className="text-xs text-slate-400">Manage your identity & communication details</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            
            {/* Full Name */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ramesh Kumar"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-kisan-500"
                required
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Mobile Number (+91) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">+91</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-12 pr-4 py-2.5 text-white font-mono font-medium focus:outline-none focus:border-kisan-500"
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@example.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-kisan-500"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-kisan-500"
              />
            </div>

            {/* State (Dropdown) */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                State / UT <span className="text-rose-400">*</span>
              </label>
              <select
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-kisan-500"
                required
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* District (Dependent Dropdown) */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                District <span className="text-rose-400">*</span>
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-kisan-500"
                required
              >
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Address / Village */}
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1.5">
                Village / House Address / Tehsil
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Village Taraori, Main GT Road"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-kisan-500"
              />
            </div>

          </div>
        </div>

        {/* SECTION 2: Farmer Crop Portfolio (Only for Farmers) */}
        {!isStaff && (
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-xl">🌾</span>
                  Farmer Crop Portfolio
                </h2>
                <p className="text-xs text-slate-400">
                  Specify all crops cultivated on your farmland for personalized slot recommendations & MSP alerts
                </p>
              </div>
            </div>

            {/* Add Crop Control */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Select Crop to Add:
                </label>
                <select
                  value={selectedCropToAdd}
                  onChange={(e) => setSelectedCropToAdd(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-kisan-500"
                >
                  {CROPS_CATALOG.map((crop) => (
                    <option key={crop.key} value={crop.key}>
                      {crop.icon} {getCropName(crop.key, lang)} ({crop.category}) - MSP: ₹{crop.msp}/Qtl
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddCrop}
                className="px-4 py-2.5 mt-auto rounded-xl bg-kisan-600 hover:bg-kisan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-kisan-600/20"
              >
                <Plus className="w-4 h-4" /> Add Crop
              </button>
            </div>

            {/* Active Crop Portfolio Tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Currently Registered Crops ({crops.length})
              </label>

              {crops.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl border border-slate-800">
                  No crops added yet. Add your primary crops above.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {crops.map((cropKey) => {
                    const info = CROPS_CATALOG.find(c => c.key === cropKey) || {
                      name: cropKey,
                      icon: '🌱',
                      msp: 2000,
                      category: 'Agricultural Produce'
                    };
                    const localizedName = getCropName(cropKey, lang);

                    return (
                      <div
                        key={cropKey}
                        className="bg-slate-950/80 border border-slate-800 hover:border-kisan-500/50 rounded-2xl p-3.5 flex items-center justify-between transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-2xl">{info.icon}</span>
                          <div className="min-w-0">
                            <p className="font-bold text-white text-xs truncate">{localizedName}</p>
                            <p className="text-[10px] text-emerald-400 font-semibold">₹{info.msp}/Qtl</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveCrop(cropKey)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove Crop"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* SECTION 3: Officer / Staff Designation & Assignment */}
        {isStaff && (
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                Mandi Officer Designation & Duty Assignment
              </h2>
              <p className="text-xs text-slate-400">
                Official role credentials and stationed Mandi procurement centre
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Official Designation / Title
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Mandi Supervisor / Senior Quality Inspector"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-kisan-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Assigned Mandi Procurement Centre
                </label>
                <select
                  value={centreId}
                  onChange={(e) => setCentreId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-kisan-500"
                >
                  <option value="">-- Select Assigned Mandi --</option>
                  {centresList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.district}, {c.state}) [{c.code}]
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Save Changes Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-kisan-600 to-kisan-500 hover:from-kisan-500 hover:to-kisan-400 text-white font-bold text-sm flex items-center gap-2 shadow-xl shadow-kisan-600/30 disabled:opacity-50 transition-all hover:scale-[1.01]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Profile Changes
              </>
            )}
          </button>
        </div>

      </form>

      {/* SECTION 4: Mandi Administration for Officers & Admins */}
      {isStaff && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                Mandi Centre Administration
              </h2>
              <p className="text-xs text-slate-400">
                Register new Mandi procurement centres and manage operational details & daily capacities
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenMandiModal()}
              className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
            >
              <PlusCircle className="w-4 h-4" /> Add New Mandi
            </button>
          </div>

          {/* Mandi List Table */}
          <div className="overflow-x-auto">
            {loadingCentres ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading Mandi centres...</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-3 px-3">Code</th>
                    <th className="py-3 px-3">Mandi Name</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Daily Capacity</th>
                    <th className="py-3 px-3">Operating Hours</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {centresList.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-300">{m.code}</td>
                      <td className="py-3 px-3 font-bold text-white">{m.name}</td>
                      <td className="py-3 px-3 text-slate-400">{m.district}, {m.state}</td>
                      <td className="py-3 px-3 font-semibold text-emerald-400">{m.daily_capacity_quintals} Qtl</td>
                      <td className="py-3 px-3 text-slate-400">{m.operating_hours || '08:00 AM - 06:00 PM'}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenMandiModal(m)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 ml-auto"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Mandi Add / Edit Modal */}
      {mandiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-fade-in">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                {editingMandiId ? 'Edit Mandi Centre' : 'Add New Mandi Centre'}
              </h3>
              <button
                onClick={() => setMandiModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {mandiError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {mandiError}
              </div>
            )}

            {mandiSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                {mandiSuccess}
              </div>
            )}

            <form onSubmit={handleSaveMandi} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Mandi Name *</label>
                <input
                  type="text"
                  value={mandiForm.name}
                  onChange={(e) => setMandiForm({ ...mandiForm, name: e.target.value })}
                  placeholder="e.g. Karnal Grain Market Hub"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-kisan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">State *</label>
                  <select
                    value={mandiForm.state}
                    onChange={(e) => {
                      const newState = e.target.value;
                      const dList = getDistrictsForState(newState);
                      setMandiForm({
                        ...mandiForm,
                        state: newState,
                        district: dList.length > 0 ? dList[0] : ''
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    required
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">District *</label>
                  <select
                    value={mandiForm.district}
                    onChange={(e) => setMandiForm({ ...mandiForm, district: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    required
                  >
                    {mandiDistricts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Mandi Address</label>
                <input
                  type="text"
                  value={mandiForm.address}
                  onChange={(e) => setMandiForm({ ...mandiForm, address: e.target.value })}
                  placeholder="e.g. Sector 12, GT Karnal Road"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-kisan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={mandiForm.contact_phone}
                    onChange={(e) => setMandiForm({ ...mandiForm, contact_phone: e.target.value })}
                    placeholder="9876543200"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-kisan-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Daily Capacity (Qtl)</label>
                  <input
                    type="number"
                    value={mandiForm.daily_capacity_quintals}
                    onChange={(e) => setMandiForm({ ...mandiForm, daily_capacity_quintals: parseFloat(e.target.value) || 0 })}
                    placeholder="1000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-kisan-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Operating Hours</label>
                <input
                  type="text"
                  value={mandiForm.operating_hours}
                  onChange={(e) => setMandiForm({ ...mandiForm, operating_hours: e.target.value })}
                  placeholder="08:00 AM - 06:00 PM"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-kisan-500"
                />
              </div>

              {!editingMandiId && (
                <p className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                  ⚡ Adding a new Mandi will automatically provision 7 days of 2-hour procurement slots for farmers in PostgreSQL.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMandiModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mandiSaving}
                  className="px-5 py-2 rounded-xl bg-kisan-600 hover:bg-kisan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-kisan-600/30"
                >
                  {mandiSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Save Mandi
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
