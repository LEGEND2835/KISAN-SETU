import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Tractor, 
  Calendar, 
  Ticket, 
  Tv, 
  BarChart3, 
  ShieldCheck, 
  Mic, 
  Languages, 
  User, 
  LogOut, 
  Menu, 
  X,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { useAuth, DEMO_PROFILES } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function Navbar({ onOpenAiModal }) {
  const { user, logout, quickSwitchProfile, isStaff } = useAuth();
  const { lang, setLanguage, languages, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 glass-header border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-kisan-500 to-kisan-700 flex items-center justify-center shadow-lg shadow-kisan-600/30 group-hover:scale-105 transition-transform">
              <Tractor className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-kisan-400 transition-colors">
                  {t('brand_title')}
                </span>
                <span className="bg-kisan-500/20 text-kisan-400 border border-kisan-500/40 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider">
                  MANDI PORTAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                National Agro-Procurement Queue Hub
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1.5">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/') 
                  ? 'bg-kisan-600/20 text-kisan-300 border border-kisan-500/30' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {t('nav_home')}
            </Link>

            {user?.role === 'farmer' && (
              <>
                <Link
                  to="/book-slot"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    isActive('/book-slot')
                      ? 'bg-kisan-600/20 text-kisan-300 border border-kisan-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-kisan-400" />
                  {t('nav_book_slot')}
                </Link>

                <Link
                  to="/my-bookings"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    isActive('/my-bookings')
                      ? 'bg-kisan-600/20 text-kisan-300 border border-kisan-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Ticket className="w-4 h-4 text-amber-400" />
                  {t('nav_my_tokens')}
                </Link>
              </>
            )}

            {isStaff && (
              <Link
                to="/centre/officer"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  isActive('/centre/officer')
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {t('nav_officer_portal')}
              </Link>
            )}

            <Link
              to="/display/ctr_karnal_01"
              target="_blank"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all flex items-center gap-1.5"
              title="Open Fullscreen Gate TV Board"
            >
              <Tv className="w-4 h-4 text-sky-400" />
              {t('nav_display_screen')}
            </Link>

            <Link
              to="/analytics"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                isActive('/analytics')
                  ? 'bg-kisan-600/20 text-kisan-300 border border-kisan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-purple-400" />
              {t('nav_analytics')}
            </Link>
          </nav>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* AI Voice Assistant Trigger */}
            <button
              onClick={onOpenAiModal}
              className="relative p-2 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-kisan-500/20 border border-amber-500/40 text-amber-300 hover:text-amber-200 hover:border-amber-400 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-md shadow-amber-500/10 group"
              title="Open Multilingual AI Assistant"
            >
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <Mic className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">{t('cta_ai_help')}</span>
            </button>

            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 text-xs sm:text-sm flex items-center gap-1.5 hover:bg-slate-700 transition-colors"
                title="Change Platform Language"
              >
                <Languages className="w-4 h-4 text-kisan-400" />
                <span className="hidden md:inline font-medium">
                  {languages.find(l => l.code === lang)?.native || 'EN'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {langDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-40 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1.5 z-50 animate-fade-in"
                  onMouseLeave={() => setLangDropdownOpen(false)}
                >
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Language
                  </div>
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs sm:text-sm flex items-center justify-between hover:bg-slate-800 transition-colors ${
                        lang === l.code ? 'text-kisan-400 font-bold bg-slate-800/50' : 'text-slate-300'
                      }`}
                    >
                      <span>{l.native}</span>
                      <span className="text-[11px] text-slate-500">{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Demo Role Switcher (Presentation Feature) */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-kisan-500/50 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
                title="1-Click Role Switcher for Demo"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Demo Roles</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-50 animate-fade-in"
                  onMouseLeave={() => setRoleDropdownOpen(false)}
                >
                  <div className="px-3 py-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    ⚡ 1-Click Role Switcher
                  </div>
                  {Object.entries(DEMO_PROFILES).map(([key, profile]) => (
                    <button
                      key={key}
                      onClick={async () => {
                        await quickSwitchProfile(key);
                        setRoleDropdownOpen(false);
                        if (profile.role === 'farmer') navigate('/my-bookings');
                        else navigate('/centre/officer');
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-slate-800 flex flex-col transition-colors border-b border-slate-800/50 last:border-0"
                    >
                      <span className="font-semibold text-slate-200">{profile.label}</span>
                      <span className="text-[10px] text-slate-500">Phone: {profile.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Profile / Login Button */}
            {user ? (
              <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-800">
                <div className="hidden xl:block text-right">
                  <p className="text-xs font-semibold text-white leading-tight">{user.full_name}</p>
                  <p className="text-[10px] text-kisan-400 capitalize font-medium">{user.role?.replace('_', ' ')}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-lg bg-kisan-600 hover:bg-kisan-500 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md shadow-kisan-600/20"
              >
                <User className="w-4 h-4" />
                <span>{t('nav_login')}</span>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-800 space-y-2 animate-fade-in">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
            >
              {t('nav_home')}
            </Link>
            {user?.role === 'farmer' && (
              <>
                <Link
                  to="/book-slot"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                >
                  {t('nav_book_slot')}
                </Link>
                <Link
                  to="/my-bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                >
                  {t('nav_my_tokens')}
                </Link>
              </>
            )}
            {isStaff && (
              <Link
                to="/centre/officer"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
              >
                {t('nav_officer_portal')}
              </Link>
            )}
            <Link
              to="/display/ctr_karnal_01"
              target="_blank"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
            >
              {t('nav_display_screen')}
            </Link>
            <Link
              to="/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
            >
              {t('nav_analytics')}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
