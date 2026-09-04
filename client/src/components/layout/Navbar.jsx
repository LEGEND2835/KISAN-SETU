import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home as HomeIcon,
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
  ChevronRight,
  Sparkles,
  Check,
  SlidersHorizontal
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
    <header className="sticky top-0 z-40 glass-header border-b border-slate-800/80 no-print transition-colors">
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-3">
          
          {/* Brand Logo & Mandi Portal Badge */}
          <Link to="/" className="flex items-center gap-1.5 sm:gap-3 group shrink-0">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full overflow-hidden shadow-lg shadow-kisan-600/30 ring-2 ring-kisan-500/50 group-hover:scale-105 group-hover:ring-kisan-400 transition-all bg-white flex items-center justify-center p-0.5 shrink-0">
              <img 
                src="/logo.png" 
                alt="KisanSetu Logo" 
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-sm sm:text-xl font-black tracking-tight text-white group-hover:text-kisan-400 transition-colors leading-none">
                  {t('brand_title')}
                </span>
                <span className="bg-kisan-500/20 text-kisan-400 border border-kisan-500/40 text-[8px] sm:text-[10px] uppercase font-bold px-1 sm:px-2 py-0.5 rounded-md tracking-wider shrink-0 leading-tight">
                  {t('brand_badge') || 'MANDI PORTAL'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden xl:block leading-tight mt-0.5">
                National Agro-Procurement Queue Hub
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden xl:flex items-center gap-1 2xl:gap-1.5 shrink-0">
            <Link
              to="/"
              className={`px-2.5 py-1.5 2xl:px-3 2xl:py-2 rounded-xl text-xs 2xl:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                isActive('/') 
                  ? 'bg-kisan-600/25 text-kisan-300 border border-kisan-500/40 shadow-sm shadow-kisan-900/30' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
              }`}
            >
              <HomeIcon className="w-3.5 h-3.5 text-kisan-400 shrink-0" />
              <span>{t('nav_home')}</span>
            </Link>

            {user?.role === 'farmer' && (
              <>
                <Link
                  to="/book-slot"
                  className={`px-2.5 py-1.5 2xl:px-3 2xl:py-2 rounded-xl text-xs 2xl:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive('/book-slot')
                      ? 'bg-kisan-600/25 text-kisan-300 border border-kisan-500/40 shadow-sm shadow-kisan-900/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-kisan-400 shrink-0" />
                  <span>{t('nav_book_slot')}</span>
                </Link>

                <Link
                  to="/my-bookings"
                  className={`px-2.5 py-1.5 2xl:px-3 2xl:py-2 rounded-xl text-xs 2xl:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive('/my-bookings')
                      ? 'bg-kisan-600/25 text-kisan-300 border border-kisan-500/40 shadow-sm shadow-kisan-900/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <Ticket className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{t('nav_my_tokens')}</span>
                </Link>
              </>
            )}

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`px-2.5 py-1.5 2xl:px-3 2xl:py-2 rounded-xl text-xs 2xl:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isActive('/admin')
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-900/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{t('nav_admin_panel') || 'Super Admin'}</span>
              </Link>
            )}

            {isStaff && user?.role !== 'admin' && (
              <Link
                to="/centre/officer"
                className={`px-2.5 py-1.5 2xl:px-3 2xl:py-2 rounded-xl text-xs 2xl:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isActive('/centre/officer')
                    ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-900/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{t('nav_officer_portal')}</span>
              </Link>
            )}

            <Link
              to="/display/ctr_karnal_01"
              target="_blank"
              className="px-2.5 py-1.5 2xl:px-3 2xl:py-2 rounded-xl text-xs 2xl:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent transition-all whitespace-nowrap flex items-center gap-1.5"
              title="Open Fullscreen Gate TV Board"
            >
              <Tv className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>{t('nav_display_screen')}</span>
            </Link>

            <Link
              to="/analytics"
              className={`px-2.5 py-1.5 2xl:px-3 2xl:py-2 rounded-xl text-xs 2xl:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                isActive('/analytics')
                  ? 'bg-kisan-600/25 text-kisan-300 border border-kisan-500/40 shadow-sm shadow-kisan-900/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>{t('nav_analytics')}</span>
            </Link>
          </nav>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            
            {/* AI Voice Assistant Trigger */}
            <button
              onClick={onOpenAiModal}
              className="relative p-2 sm:px-2.5 sm:py-1.5 2xl:px-3 2xl:py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-kisan-500/20 border border-amber-500/40 text-amber-300 hover:text-amber-200 hover:border-amber-400 text-xs sm:text-sm font-semibold flex items-center gap-1.5 2xl:gap-2 transition-all shadow-md shadow-amber-500/10 group shrink-0"
              title="Open Multilingual AI Assistant"
            >
              <span className="absolute -top-1 -right-1 flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-amber-500"></span>
              </span>
              <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="hidden md:inline whitespace-nowrap text-xs 2xl:text-sm">{t('cta_ai_help')}</span>
            </button>

            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-1 hover:bg-slate-700 hover:border-slate-600 transition-all shrink-0 shadow-sm"
                title="Change Platform Language"
              >
                <Languages className="w-3.5 h-3.5 text-kisan-400 shrink-0" />
                <span className="font-medium whitespace-nowrap text-xs sm:text-sm">
                  <span className="sm:hidden">{lang.toUpperCase()}</span>
                  <span className="hidden sm:inline">{languages.find(l => l.code === lang)?.native || 'EN'}</span>
                </span>
                <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 transition-transform duration-200 ${langDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {langDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-48 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl py-2 z-50 animate-fade-in"
                  onMouseLeave={() => setLangDropdownOpen(false)}
                >
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1.5 mb-1">
                    Select Language / भाषा
                  </div>
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs sm:text-sm flex items-center justify-between hover:bg-slate-800 transition-colors ${
                        lang === l.code ? 'text-kisan-400 font-bold bg-slate-800/60' : 'text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {lang === l.code && <Check className="w-3.5 h-3.5 text-kisan-400" />}
                        <span className={lang === l.code ? '' : 'pl-5'}>{l.native}</span>
                      </span>
                      <span className="text-[11px] text-slate-500">{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Demo Role Switcher (Presentation Feature) */}
            <div className="relative hidden 2xl:block">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="px-2.5 py-1.5 2xl:px-3 2xl:py-2 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-amber-500/50 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
                title="1-Click Role Switcher for Demo"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="whitespace-nowrap">Demo Roles</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${roleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {roleDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl py-2 z-50 animate-fade-in"
                  onMouseLeave={() => setRoleDropdownOpen(false)}
                >
                  <div className="px-3 py-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-1 mb-1">
                    ⚡ 1-Click Demo Role Switcher
                  </div>
                  {Object.entries(DEMO_PROFILES).map(([key, profile]) => (
                    <button
                      key={key}
                      onClick={async () => {
                        await quickSwitchProfile(key);
                        setRoleDropdownOpen(false);
                        if (profile.role === 'farmer') navigate('/my-bookings');
                        else if (profile.role === 'admin') navigate('/admin');
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

            {/* User Profile / Login Button (Visible on sm+, in drawer on mobile) */}
            {user ? (
              <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-800 shrink-0">
                <Link
                  to="/profile"
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all ${
                    isActive('/profile')
                      ? 'bg-kisan-600/20 border-kisan-500 text-kisan-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600'
                  }`}
                  title="View / Edit My Account Profile"
                >
                  <div className="w-6 h-6 rounded-full bg-kisan-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden 2xl:block text-left">
                    <p className="text-xs font-semibold text-white leading-tight truncate max-w-[100px]">{user.full_name}</p>
                    <p className="text-[10px] text-kisan-400 capitalize font-medium">{user.role?.replace('_', ' ')}</p>
                  </div>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors shrink-0"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:flex px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-kisan-600 hover:bg-kisan-500 text-white font-semibold text-xs sm:text-sm items-center gap-1.5 transition-all shadow-md shadow-kisan-600/20 shrink-0"
              >
                <User className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{t('nav_login')}</span>
              </Link>
            )}

            {/* Mobile Menu Button (visible on < xl) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60 xl:hidden transition-colors shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden py-4 border-t border-slate-800 space-y-2 animate-fade-in pb-6">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive('/') ? 'bg-kisan-600/20 text-kisan-300 border border-kisan-500/30 font-semibold' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <HomeIcon className="w-4 h-4 text-kisan-400" />
              <span>{t('nav_home')}</span>
            </Link>

            {user?.role === 'farmer' && (
              <>
                <Link
                  to="/book-slot"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/book-slot') ? 'bg-kisan-600/20 text-kisan-300 border border-kisan-500/30 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-kisan-400" />
                  <span>{t('nav_book_slot')}</span>
                </Link>
                <Link
                  to="/my-bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/my-bookings') ? 'bg-kisan-600/20 text-kisan-300 border border-kisan-500/30 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Ticket className="w-4 h-4 text-amber-400" />
                  <span>{t('nav_my_tokens')}</span>
                </Link>
              </>
            )}

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive('/admin') ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span>{t('nav_admin_panel') || 'Super Admin'}</span>
              </Link>
            )}

            {isStaff && user?.role !== 'admin' && (
              <Link
                to="/centre/officer"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive('/centre/officer') ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{t('nav_officer_portal')}</span>
              </Link>
            )}

            <Link
              to="/display/ctr_karnal_01"
              target="_blank"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              <Tv className="w-4 h-4 text-sky-400" />
              <span>{t('nav_display_screen')}</span>
            </Link>

            <Link
              to="/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive('/analytics') ? 'bg-kisan-600/20 text-kisan-300 border border-kisan-500/30 font-semibold' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span>{t('nav_analytics')}</span>
            </Link>

            {/* Mobile User Profile Section */}
            {user ? (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm text-kisan-300 hover:bg-slate-800 font-semibold bg-kisan-950/40 border border-kisan-800/40"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-6 h-6 rounded-full bg-kisan-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="truncate">{user.full_name} ({user.role?.replace('_', ' ')})</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </Link>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('nav_logout')}</span>
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-800">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-kisan-600 hover:bg-kisan-500 text-white font-semibold text-sm shadow-md"
                >
                  <User className="w-4 h-4" />
                  <span>{t('nav_login')}</span>
                </Link>
              </div>
            )}

            {/* Mobile Demo Role Picker */}
            <div className="pt-3 border-t border-slate-800/80">
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider px-3 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Switch Demo Role</span>
              </div>
              <div className="grid grid-cols-2 gap-2 px-1">
                {Object.entries(DEMO_PROFILES).map(([key, profile]) => (
                  <button
                    key={key}
                    onClick={async () => {
                      await quickSwitchProfile(key);
                      setMobileMenuOpen(false);
                      if (profile.role === 'farmer') navigate('/my-bookings');
                      else if (profile.role === 'admin') navigate('/admin');
                      else navigate('/centre/officer');
                    }}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs hover:border-kisan-500/50"
                  >
                    <div className="font-semibold text-slate-200 truncate">{profile.label}</div>
                    <div className="text-[10px] text-slate-500">{profile.role}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
