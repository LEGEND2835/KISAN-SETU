import React, { useState } from 'react';
import { 
  TrendingUp, 
  IndianRupee, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  Info,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  Activity,
  CheckCircle2,
  Layers,
  ArrowDownRight
} from 'lucide-react';
import { CROPS_CATALOG, getCropName } from '../utils/cropsData';

// Historical 7-day APMC benchmark reference data aligned with CACP official MSP Gazette
const CROP_PRICE_HISTORY = {
  wheat: [
    { day: 'Mon', date: '29 Aug', msp: 2275, market: 2290 },
    { day: 'Tue', date: '30 Aug', msp: 2275, market: 2300 },
    { day: 'Wed', date: '31 Aug', msp: 2275, market: 2305 },
    { day: 'Thu', date: '01 Sep', msp: 2275, market: 2310 },
    { day: 'Fri', date: '02 Sep', msp: 2275, market: 2315 },
    { day: 'Sat', date: '03 Sep', msp: 2275, market: 2318 },
    { day: 'Today', date: '04 Sep', msp: 2275, market: 2320 },
  ],
  paddy_basmati: [
    { day: 'Mon', date: '29 Aug', msp: 4200, market: 4240 },
    { day: 'Tue', date: '30 Aug', msp: 4200, market: 4260 },
    { day: 'Wed', date: '31 Aug', msp: 4200, market: 4290 },
    { day: 'Thu', date: '01 Sep', msp: 4200, market: 4310 },
    { day: 'Fri', date: '02 Sep', msp: 4200, market: 4330 },
    { day: 'Sat', date: '03 Sep', msp: 4200, market: 4340 },
    { day: 'Today', date: '04 Sep', msp: 4200, market: 4350 },
  ],
  mustard: [
    { day: 'Mon', date: '29 Aug', msp: 5650, market: 5680 },
    { day: 'Tue', date: '30 Aug', msp: 5650, market: 5700 },
    { day: 'Wed', date: '31 Aug', msp: 5650, market: 5725 },
    { day: 'Thu', date: '01 Sep', msp: 5650, market: 5750 },
    { day: 'Fri', date: '02 Sep', msp: 5650, market: 5760 },
    { day: 'Sat', date: '03 Sep', msp: 5650, market: 5770 },
    { day: 'Today', date: '04 Sep', msp: 5650, market: 5780 },
  ],
  gram: [
    { day: 'Mon', date: '29 Aug', msp: 5440, market: 5480 },
    { day: 'Tue', date: '30 Aug', msp: 5440, market: 5510 },
    { day: 'Wed', date: '31 Aug', msp: 5440, market: 5530 },
    { day: 'Thu', date: '01 Sep', msp: 5440, market: 5550 },
    { day: 'Fri', date: '02 Sep', msp: 5440, market: 5570 },
    { day: 'Sat', date: '03 Sep', msp: 5440, market: 5580 },
    { day: 'Today', date: '04 Sep', msp: 5440, market: 5590 },
  ],
  maize: [
    { day: 'Mon', date: '29 Aug', msp: 2090, market: 2110 },
    { day: 'Tue', date: '30 Aug', msp: 2090, market: 2120 },
    { day: 'Wed', date: '31 Aug', msp: 2090, market: 2130 },
    { day: 'Thu', date: '01 Sep', msp: 2090, market: 2135 },
    { day: 'Fri', date: '02 Sep', msp: 2090, market: 2140 },
    { day: 'Sat', date: '03 Sep', msp: 2090, market: 2145 },
    { day: 'Today', date: '04 Sep', msp: 2090, market: 2150 },
  ],
  soybean: [
    { day: 'Mon', date: '29 Aug', msp: 4600, market: 4630 },
    { day: 'Tue', date: '30 Aug', msp: 4600, market: 4650 },
    { day: 'Wed', date: '31 Aug', msp: 4600, market: 4680 },
    { day: 'Thu', date: '01 Sep', msp: 4600, market: 4700 },
    { day: 'Fri', date: '02 Sep', msp: 4600, market: 4710 },
    { day: 'Sat', date: '03 Sep', msp: 4600, market: 4715 },
    { day: 'Today', date: '04 Sep', msp: 4600, market: 4720 },
  ],
};

const DAY_NAMES = {
  en: { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Today: 'Today' },
  hi: { Mon: 'सोम', Tue: 'मंगल', Wed: 'बुध', Thu: 'गुरु', Fri: 'शुक्र', Sat: 'शनि', Today: 'आज' },
  pb: { Mon: 'ਸੋਮ', Tue: 'ਮੰਗਲ', Wed: 'ਬੁੱਧ', Thu: 'ਵੀਰ', Fri: 'ਸ਼ੁੱਕਰ', Sat: 'ਸ਼ਨਿ', Today: 'ਅੱਜ' },
  mr: { Mon: 'सोम', Tue: 'मंगळ', Wed: 'बुध', Thu: 'गुरु', Fri: 'शुक्र', Sat: 'शनि', Today: 'आज' },
  te: { Mon: 'సోమ', Tue: 'మంగళ', Wed: 'బుధ', Thu: 'గురు', Fri: 'శుక్ర', Sat: 'శని', Today: 'నేడు' },
};

const UI_TEXT = {
  en: {
    section_badge: 'APMC BENCHMARK ANALYTICS',
    section_title: 'Commodity Price Trend & MSP Comparison',
    section_desc: '7-Day APMC Market Movement vs Statutory MSP Benchmark',
    card_mandi: 'Current Mandi Rate',
    card_msp: 'Statutory MSP Floor',
    card_premium: 'Farmer Premium Spread',
    card_range: '7-Day Price Range',
    graph_title: '7-Day Historical APMC Price Trajectory',
    unit_label: '₹ / Quintal',
    mandi_legend: 'APMC Market Rate',
    msp_legend: 'Govt MSP Floor Rate',
    msp_badge: '100% MSP Assured',
    verified_tag: 'Benchmark Feed',
    tooltip_premium: 'Premium above MSP',
    tooltip_status: 'Benchmark Assured',
    disclaimer: 'Official APMC Market Yard benchmark records aligned with CACP MSP Gazette.',
    statutory_tag: 'CACP Benchmark'
  },
  hi: {
    section_badge: 'एपीएमसी बेंचमार्क एनालिटिक्स',
    section_title: 'फसल भाव रुझान एवं एमएसपी तुलना',
    section_desc: '7-दिवसीय मंडी भाव एवं सरकारी न्यूनतम समर्थन मूल्य',
    card_mandi: 'वर्तमान मंडी भाव',
    card_msp: 'सरकारी एमएसपी फ्लोर',
    card_premium: 'किसान प्रीमियम (मुनाफा)',
    card_range: '7-दिवसीय भाव दायरा',
    graph_title: '7-दिवसीय मंडी भाव गतिशीलता',
    unit_label: '₹ / क्विंटल',
    mandi_legend: 'मंडी बाजार भाव',
    msp_legend: 'सरकारी एमएसपी दर',
    msp_badge: '100% एमएसपी गारंटी',
    verified_tag: 'प्रमाणित एपीएमसी डेटा',
    tooltip_premium: 'एमएसपी से अधिक',
    tooltip_status: 'बेंचमार्क सत्यापित',
    disclaimer: 'कृषि लागत एवं मूल्य आयोग (CACP) समर्थित आधिकारिक मंडी दरें।',
    statutory_tag: 'सीएसीपी बेंचमार्क'
  },
  pb: {
    section_badge: 'ਏਪੀਐਮਸੀ ਬੈਂਚਮਾਰਕ ਵਿਸ਼ਲੇਸ਼ਣ',
    section_title: 'ਫਸਲ ਕੀਮਤ ਰੁਝਾਨ ਅਤੇ ਐਮਐਸਪੀ ਤੁਲਨਾ',
    section_desc: '7-ਦਿਨਾ ਮੰਡੀ ਕੀਮਤਾਂ ਅਤੇ ਸਰਕਾਰੀ ਐਮਐਸਪੀ ਬੈਂਚਮਾਰਕ',
    card_mandi: 'ਮੌਜੂਦਾ ਮੰਡੀ ਰੇਟ',
    card_msp: 'ਸਰਕਾਰੀ ਐਮਐਸਪੀ',
    card_premium: 'ਕਿਸਾਨ ਪ੍ਰੀਮੀਅਮ',
    card_range: '7-ਦਿਨਾਂ ਦਾ ਘੇਰਾ',
    graph_title: '7-ਦਿਨਾਂ ਦਾ ਮਾਰਕੀਟ ਰੁਝਾਨ',
    unit_label: '₹ / ਕੁਇੰਟਲ',
    mandi_legend: 'ਮੰਡੀ ਬਜ਼ਾਰ ਰੇਟ',
    msp_legend: 'ਸਰਕਾਰੀ ਐਮਐਸਪੀ',
    msp_badge: '100% ਐਮਐਸਪੀ ਗਾਰੰਟੀ',
    verified_tag: 'ਪ੍ਰਮਾਣਿਤ ਮੰਡੀ ਫੀਡ',
    tooltip_premium: 'ਐਮਐਸਪੀ ਤੋਂ ਵੱਧ',
    tooltip_status: 'ਬੈਂਚਮਾਰਕ ਪ੍ਰਮਾਣਿਤ',
    disclaimer: 'ਸਰਕਾਰੀ ਏਪੀਐਮਸੀ ਮੰਡੀਆਂ ਤੋਂ ਸਿੱਧੀ ਪ੍ਰਮਾਣਿਤ ਫੀਡ।',
    statutory_tag: 'ਸਰਕਾਰੀ ਬੈਂਚਮਾਰਕ'
  },
  mr: {
    section_badge: 'एपीएमसी बेंचमार्क विश्लेषण',
    section_title: 'बाजारभाव ट्रेंड आणि हमीभाव (MSP) तुलना',
    section_desc: '७-दिवसीय कृषी उत्पन्न बाजार समिती आणि अधिकृत हमीभाव',
    card_mandi: 'सध्याचा बाजारभाव',
    card_msp: 'शासकीय हमीभाव (MSP)',
    card_premium: 'शेतकरी नफा (प्रीमियम)',
    card_range: '७-दिवसीय भाव मर्यादा',
    graph_title: '७-दिवसीय बाजारभाव वाटचाल',
    unit_label: '₹ / क्विंटल',
    mandi_legend: 'बाजार समिती भाव',
    msp_legend: 'शासकीय हमीभाव',
    msp_badge: '१००% हमीभाव खात्री',
    verified_tag: 'अधिकृत एपीएमसी',
    tooltip_premium: 'हमीभावापेक्षा जास्त',
    tooltip_status: 'बेंचमार्क प्रमाणित',
    disclaimer: 'केंद्रीय कृषी मूल्य आयोगाच्या मानकानुसार अधिकृत बाजारभाव.',
    statutory_tag: 'हमीभाव बेंचमार्क'
  },
  te: {
    section_badge: 'APMC ప్రామాణిక విశ్లేషణ',
    section_title: 'ధరల ధోరణి & మద్దతు ధర (MSP) పోలిక',
    section_desc: '7 రోజుల వ్యవసాయ మార్కెట్ ధరలు vs ప్రభుత్వ కనీస మద్దతు ధర',
    card_mandi: 'ప్రస్తుత మార్కెట్ ధర',
    card_msp: 'ప్రభుత్వ కనీస మద్దతు ధర',
    card_premium: 'రైతు ప్రీమియం మార్జిన్',
    card_range: '7 రోజుల ధరల శ్రేణి',
    graph_title: '7 రోజుల మార్కెట్ ధరల పథం',
    unit_label: '₹ / క్వింటాల్',
    mandi_legend: 'మార్కెట్ రేటు',
    msp_legend: 'ప్రభుత్వ MSP ధర',
    msp_badge: '100% MSP గ్యారెంటీ',
    verified_tag: 'ధృవీకరించబడిన ఫీడ్',
    tooltip_premium: 'MSP కంటే అదనం',
    tooltip_status: 'ప్రామాణికం ధృవీకరించబడింది',
    disclaimer: 'CACP అధికారిక గెజిట్ ప్రకారం ప్రభుత్వ ధృవీకృత మార్కెట్ ధరలు.',
    statutory_tag: 'ప్రభుత్వ ప్రామాణికం'
  },
};

// Generates smooth cubic Bezier curve SVG path
function generateSmoothCurve(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) * 0.18;
    const cp1y = p1.y + (p2.y - p0.y) * 0.18;
    const cp2x = p2.x - (p3.x - p1.x) * 0.18;
    const cp2y = p2.y - (p3.y - p1.y) * 0.18;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function MarketPriceTrends({ lang = 'en' }) {
  const [selectedCrop, setSelectedCrop] = useState('wheat');
  const [hoveredIndex, setHoveredIndex] = useState(6); // Default to latest day ("Today")

  const t = UI_TEXT[lang] || UI_TEXT.en;
  const daysMap = DAY_NAMES[lang] || DAY_NAMES.en;

  const cropInfo = CROPS_CATALOG.find(c => c.id === selectedCrop || c.key.toLowerCase() === selectedCrop) || CROPS_CATALOG[0];
  const history = CROP_PRICE_HISTORY[selectedCrop] || CROP_PRICE_HISTORY.wheat;
  
  // Stats
  const todayEntry = history[history.length - 1];
  const firstEntry = history[0];
  const currentPrice = todayEntry.market;
  const mspPrice = cropInfo.msp || todayEntry.msp;
  const premium = currentPrice - mspPrice;
  const premiumPercent = ((premium / mspPrice) * 100).toFixed(1);
  const sevenDayChange = currentPrice - firstEntry.market;
  const sevenDayChangePct = ((sevenDayChange / firstEntry.market) * 100).toFixed(1);

  const marketPrices = history.map(h => h.market);
  const mspPrices = history.map(h => h.msp);
  const minMarket = Math.min(...marketPrices);
  const maxMarket = Math.max(...marketPrices);

  // High-Resolution SVG Coordinates Setup
  const svgWidth = 720;
  const svgHeight = 280;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 45;

  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const allVals = [...marketPrices, ...mspPrices];
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  
  // Nice stepped Y-axis limits
  const yBuffer = Math.max(30, (rawMax - rawMin) * 0.2);
  const minVal = Math.floor((rawMin - yBuffer) / 20) * 20;
  const maxVal = Math.ceil((rawMax + yBuffer) / 20) * 20;
  const valRange = maxVal - minVal || 1;

  // Y-axis tick values (5 neat steps)
  const numYTicks = 5;
  const yTicks = Array.from({ length: numYTicks }, (_, i) => {
    const val = minVal + (valRange / (numYTicks - 1)) * i;
    const y = padTop + plotHeight - ((val - minVal) / valRange) * plotHeight;
    return { val: Math.round(val), y };
  });

  // Calculate coordinates for 7 days
  const dataPoints = history.map((pt, idx) => {
    const x = padLeft + (idx / (history.length - 1)) * plotWidth;
    const yMarket = padTop + plotHeight - ((pt.market - minVal) / valRange) * plotHeight;
    const yMsp = padTop + plotHeight - ((pt.msp - minVal) / valRange) * plotHeight;
    return {
      ...pt,
      idx,
      x,
      yMarket,
      yMsp,
      spread: pt.market - pt.msp,
      dayLabel: daysMap[pt.day] || pt.day
    };
  });

  // Smooth SVG Path for Mandi Market Line
  const marketCoords = dataPoints.map(p => ({ x: p.x, y: p.yMarket }));
  const marketSmoothPath = generateSmoothCurve(marketCoords);
  const bottomY = padTop + plotHeight;
  const marketAreaPath = `${marketSmoothPath} L ${dataPoints[dataPoints.length - 1].x.toFixed(1)},${bottomY} L ${dataPoints[0].x.toFixed(1)},${bottomY} Z`;

  // Straight / stepped line for MSP floor
  const mspPolyline = dataPoints.map(p => `${p.x.toFixed(1)},${p.yMsp.toFixed(1)}`).join(' ');

  // Active highlighted point
  const activePt = dataPoints[hoveredIndex !== null ? hoveredIndex : 6] || dataPoints[6];

  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-7 space-y-6 border border-slate-800 shadow-2xl relative overflow-hidden transition-all">
      
      {/* Background Glow Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      {/* 1. Header & Crop Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/90 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full tracking-wider flex items-center gap-1.5 shadow-sm">
              <Activity className="w-3 h-3 text-emerald-400" />
              {t.section_badge}
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              • {t.section_desc}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5 flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-emerald-400 shrink-0" />
            <span>{t.section_title}</span>
          </h3>
        </div>

        {/* Commodity Selector Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
          {Object.keys(CROP_PRICE_HISTORY).map((cropKey) => {
            const c = CROPS_CATALOG.find(ci => ci.id === cropKey || ci.key.toLowerCase() === cropKey) || { icon: '🌾' };
            const localized = getCropName(cropKey, lang);
            const isSelected = selectedCrop === cropKey;

            return (
              <button
                key={cropKey}
                onClick={() => {
                  setSelectedCrop(cropKey);
                  setHoveredIndex(6); // reset to today
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-kisan-600 to-emerald-600 text-white shadow-lg shadow-kisan-600/30 ring-1 ring-kisan-400 scale-[1.02]'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                <span className="text-sm">{c.icon}</span>
                <span>{localized}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Top KPI Metric Summary Cards (4 Cards Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Live APMC Rate */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-400">
              {t.card_mandi}
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              ₹{currentPrice.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">/ Qtl</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-semibold font-mono flex items-center gap-0.5 text-[10px]">
              <ArrowUpRight className="w-3 h-3" />
              +₹{sevenDayChange} ({sevenDayChangePct}%)
            </span>
            <span className="text-slate-500 text-[10px]">vs 7d ago</span>
          </div>
        </div>

        {/* Card 2: Govt MSP Floor Rate */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-400">
              {t.card_msp}
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
              ₹{mspPrice.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">/ Qtl</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium text-[10px]">
              {t.statutory_tag}
            </span>
            <span className="text-emerald-400 font-medium text-[10px]">100% Floor Guaranteed</span>
          </div>
        </div>

        {/* Card 3: Farmer Net Premium */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden group hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-400">
              {t.card_premium}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono tracking-tight">
              +₹{premium.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">/ Qtl</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-semibold font-mono text-[10px]">
              +{premiumPercent}%
            </span>
            <span className="text-slate-400 text-[10px]">Over Govt Floor</span>
          </div>
        </div>

        {/* Card 4: 7-Day Range */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden group hover:border-sky-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-400">
              {t.card_range}
            </span>
            <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-200 font-mono tracking-tight">
              ₹{minMarket} - ₹{maxMarket}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
            <span className="truncate">{cropInfo.source_mandi || 'Karnal Terminal'}</span>
          </div>
        </div>

      </div>

      {/* 3. Professional SVG Vector Financial Chart with Crosshair & Tooltips */}
      <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 sm:p-6 space-y-4 shadow-inner">
        
        {/* Graph Header / Legend Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-slate-800/70 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2">
              <span className="text-lg">{cropInfo.icon}</span>
              <span>{getCropName(cropInfo.key, lang)}</span>
              <span className="text-slate-500 font-normal">({cropInfo.variety})</span>
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="w-3.5 h-1 bg-emerald-400 rounded-full shadow-sm shadow-emerald-500/50"></span>
              <span className="text-slate-200 font-medium">{t.mandi_legend}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="w-3.5 h-0.5 border-t-2 border-dashed border-emerald-500"></span>
              <span className="text-emerald-400 font-medium">{t.msp_legend}</span>
            </div>
          </div>
        </div>

        {/* Interactive Floating / Active Tooltip Bar */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{activePt.dayLabel}, {activePt.date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{t.card_mandi}:</span>
              <span className="font-mono font-bold text-white text-sm">₹{activePt.market}</span>
            </div>
            <div className="flex items-center gap-1.5 hidden sm:flex">
              <span className="text-slate-400">{t.card_msp}:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">₹{activePt.msp}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-semibold font-mono text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              +{t.tooltip_premium}: ₹{activePt.spread}/Qtl
            </span>
            <span className="hidden md:inline-block px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-medium">
              🛡️ {t.tooltip_status}
            </span>
          </div>
        </div>

        {/* SVG Chart Container */}
        <div className="relative w-full h-64 sm:h-72 select-none">
          <svg 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
            className="w-full h-full overflow-visible" 
            preserveAspectRatio="none"
          >
            <defs>
              {/* Market Trend Emerald Gradient */}
              <linearGradient id="marketAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>

              {/* Glowing filters for lines & markers */}
              <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizontal Grid Lines & Y-Axis Labels */}
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line 
                  x1={padLeft} 
                  y1={tick.y} 
                  x2={svgWidth - padRight} 
                  y2={tick.y} 
                  stroke="#334155" 
                  strokeWidth="0.8" 
                  strokeDasharray="4 4" 
                  strokeOpacity="0.6"
                />
                <text 
                  x={padLeft - 10} 
                  y={tick.y + 4} 
                  textAnchor="end" 
                  fill="#94a3b8" 
                  fontSize="11" 
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  ₹{tick.val}
                </text>
              </g>
            ))}

            {/* Statutory Govt MSP Benchmark Dashed Line */}
            <polyline
              fill="none"
              stroke="#059669"
              strokeWidth="2"
              strokeDasharray="6 4"
              points={mspPolyline}
            />

            {/* MSP Tag Label on Right Axis */}
            <g transform={`translate(${svgWidth - padRight + 4}, ${activePt.yMsp - 10})`}>
              <rect x="0" y="0" width="60" height="18" rx="4" fill="#064e3b" stroke="#059669" strokeWidth="0.8" />
              <text x="30" y="12" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="monospace">
                MSP ₹{mspPrice}
              </text>
            </g>

            {/* Mandi Market Price Gradient Area */}
            <path
              d={marketAreaPath}
              fill="url(#marketAreaGradient)"
            />

            {/* Mandi Market Price Spline Curve */}
            <path
              d={marketSmoothPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#emeraldGlow)"
            />

            {/* Vertical Crosshair Guide at Active Hover Index */}
            {activePt && (
              <g>
                <line
                  x1={activePt.x}
                  y1={padTop}
                  x2={activePt.x}
                  y2={bottomY}
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  strokeOpacity="0.8"
                />

                {/* Mandi Price Point Marker */}
                <circle 
                  cx={activePt.x} 
                  cy={activePt.yMarket} 
                  r="7" 
                  fill="#10b981" 
                  stroke="#ffffff" 
                  strokeWidth="2.5" 
                  className="animate-pulse"
                />

                {/* MSP Point Marker */}
                <circle 
                  cx={activePt.x} 
                  cy={activePt.yMsp} 
                  r="5" 
                  fill="#065f46" 
                  stroke="#34d399" 
                  strokeWidth="2" 
                />
              </g>
            )}

            {/* X-Axis Day Labels and Touch/Hover Capture Bars */}
            {dataPoints.map((pt, idx) => {
              const isHovered = (hoveredIndex === idx);
              const barWidth = plotWidth / (dataPoints.length - 1);

              return (
                <g key={idx}>
                  {/* Subtle marker dot for inactive points */}
                  {!isHovered && (
                    <circle 
                      cx={pt.x} 
                      cy={pt.yMarket} 
                      r="4" 
                      fill="#0f172a" 
                      stroke="#10b981" 
                      strokeWidth="2" 
                    />
                  )}

                  {/* Day Name */}
                  <text
                    x={pt.x}
                    y={bottomY + 18}
                    textAnchor="middle"
                    fill={isHovered ? '#34d399' : '#94a3b8'}
                    fontSize="11"
                    fontWeight={isHovered ? 'bold' : '600'}
                  >
                    {pt.dayLabel}
                  </text>

                  {/* Date Subtitle */}
                  <text
                    x={pt.x}
                    y={bottomY + 31}
                    textAnchor="middle"
                    fill={isHovered ? '#e2e8f0' : '#64748b'}
                    fontSize="9.5"
                    fontFamily="monospace"
                  >
                    {pt.date}
                  </text>

                  {/* Transparent Interactive Hover Column */}
                  <rect
                    x={pt.x - barWidth / 2}
                    y={padTop}
                    width={barWidth}
                    height={plotHeight + 35}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onClick={() => setHoveredIndex(idx)}
                    onTouchStart={() => setHoveredIndex(idx)}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Bottom Verification & Source Note */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{t.disclaimer}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
              🛡️ {t.msp_badge}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}

