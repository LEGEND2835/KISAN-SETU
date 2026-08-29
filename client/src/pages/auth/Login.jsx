import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Tractor, ShieldCheck, Sparkles, User, Lock, Phone, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth, DEMO_PROFILES } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function Login() {
  const { login, registerFarmer, quickSwitchProfile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('9876543210');
  const [password, setPassword] = useState('farmer123');
  const [role, setRole] = useState('farmer');

  // Register Form States
  const [fullName, setFullName] = useState('');
  const [state, setState] = useState('Haryana');
  const [district, setDistrict] = useState('Karnal');
  const [village, setVillage] = useState('Taraori');

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await registerFarmer({
          full_name: fullName,
          phone,
          state,
          district,
          village,
          password,
          role,
        });
        if (res.user?.role === 'farmer') navigate('/my-bookings');
        else navigate('/centre/officer');
      } else {
        const res = await login(phone, password);
        if (res.user?.role === 'farmer') navigate('/my-bookings');
        else navigate('/centre/officer');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6 animate-fade-in">
      
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-kisan-500 to-kisan-700 flex items-center justify-center text-white mx-auto shadow-lg shadow-kisan-600/30">
          <Tractor className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          {isRegister ? 'Register Account' : 'Login to KisanSetu'}
        </h1>
        <p className="text-xs text-slate-400">
          {isRegister
            ? 'Create a new account for slot booking and Mandi procurement'
            : 'Sign in to access your digital passes, slots, and operations'}
        </p>
      </div>

      {/* 1-Click Fast Demo Credentials Box */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> 1-Click Quick Demo Profiles
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Pre-seeded</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(DEMO_PROFILES).map(([key, profile]) => (
            <button
              key={key}
              type="button"
              onClick={async () => {
                await quickSwitchProfile(key);
                if (profile.role === 'farmer') navigate('/my-bookings');
                else navigate('/centre/officer');
              }}
              className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition-colors flex flex-col justify-between"
            >
              <span className="font-bold text-slate-200 line-clamp-1">{profile.label.split('(')[0]}</span>
              <span className="text-[10px] text-slate-400 capitalize">{profile.role.replace('_', ' ')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Login / Register Form */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5">
        
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {isRegister && (
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ramesh Kumar"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-kisan-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Mobile Number</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">+91</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-12 pr-4 py-2.5 text-white font-mono focus:outline-none focus:border-kisan-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-kisan-500"
              required
            />
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Select Account Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-kisan-500"
                >
                  <option value="farmer">Farmer</option>
                  <option value="centre_officer">Mandi Supervisor / Officer</option>
                  <option value="quality_inspector">Quality Inspector</option>
                  <option value="weighbridge_operator">Weighbridge Operator</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">District</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-kisan-600 hover:bg-kisan-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-kisan-600/30 transition-all mt-2"
          >
            {isRegister ? 'Complete Registration' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg('');
            }}
            className="text-xs text-kisan-400 hover:underline font-semibold"
          >
            {isRegister ? 'Already registered? Sign in here' : 'New User? Register for KisanSetu account'}
          </button>
        </div>

      </div>

    </div>
  );
}
