import React from 'react';
import { Tractor, Heart, Shield, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="mt-20 border-t border-slate-800/80 bg-slate-950/60 text-slate-400 text-xs py-10 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white ring-2 ring-kisan-500/40 flex items-center justify-center p-0.5">
                <img 
                  src="/logo.png" 
                  alt="KisanSetu Logo" 
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="text-base font-bold text-white tracking-tight">{t('brand_title')}</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              National Innovation Platform for Automated Agricultural Procurement & Realtime Mandi Queue Management.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Core Portals</h4>
            <ul className="space-y-2 text-slate-400">
              <li><a href="/book-slot" className="hover:text-kisan-400 transition-colors">Farmer Slot Booking</a></li>
              <li><a href="/my-bookings" className="hover:text-kisan-400 transition-colors">Digital Passes & J-Form</a></li>
              <li><a href="/centre/officer" className="hover:text-kisan-400 transition-colors">Mandi Officer Control Center</a></li>
              <li><a href="/display/ctr_karnal_01" className="hover:text-kisan-400 transition-colors">Gate Big Screen TV Board</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">AI Intelligence</h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> Dynamic ETA Predictor</li>
              <li className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-kisan-400" /> Slot Load Distribution</li>
              <li className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-sky-400" /> Regional Congestion Router</li>
              <li className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-purple-400" /> Multilingual Voice Help</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Standards & Compliance</h4>
            <p className="text-slate-400 text-xs mb-2">
              Compliant with Ministry of Agriculture & Farmers Welfare, Food Corporation of India (FCI) MSP norms & DBT framework.
            </p>
            <div className="flex items-center gap-2 text-kisan-400 font-medium text-[11px]">
              <Shield className="w-4 h-4" /> 100% Encrypted & Verifiable
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500">
          <p>© 2026 KisanSetu Platform. Smart Mandi Procurement System.</p>
          <p className="flex items-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for Indian Farmers (Annadata)
          </p>
        </div>
      </div>
    </footer>
  );
}
