/**
 * Master Agricultural Commodities & Crop Localization Data
 * Clean separation between languages without concatenated strings.
 */

export const MASTER_CROPS = [
  {
    id: 'wheat',
    key: 'Wheat',
    en: 'Wheat',
    hi: 'गेहूं',
    pb: 'ਕਣਕ',
    mr: 'गहू',
    te: 'గోధుమలు',
    variety: 'HD-2967 (Grade A)',
    msp: 2275,
    market_price: 2320,
    source_mandi: 'Karnal Mega Grain Terminal (APMC)',
    icon: '🌾',
    category: 'Rabi Cereal',
  },
  {
    id: 'paddy_basmati',
    key: 'Paddy (Basmati)',
    en: 'Paddy (Basmati)',
    hi: 'धान (बासमती)',
    pb: 'ਝੋਨਾ (ਬਾਸਮਤੀ)',
    mr: 'भात (बासमती)',
    te: 'వరి (బాస్మతి)',
    variety: 'Pusa 1121',
    msp: 4200,
    market_price: 4350,
    source_mandi: 'Khanna Asia Grain Terminal (APMC)',
    icon: '🌾',
    category: 'Kharif Cereal',
  },
  {
    id: 'paddy_pr',
    key: 'Paddy (PR)',
    en: 'Paddy (PR)',
    hi: 'धान (पीआर)',
    pb: 'ਝੋਨਾ (ਪੀਆਰ)',
    mr: 'भात (पीआर)',
    te: 'వరి (సాధారణ)',
    variety: 'PR-126',
    msp: 2183,
    market_price: 2210,
    source_mandi: 'Karnal Mega Grain Terminal (APMC)',
    icon: '🌾',
    category: 'Kharif Cereal',
  },
  {
    id: 'mustard',
    key: 'Mustard',
    en: 'Mustard',
    hi: 'सरसों',
    pb: 'ਸਰ੍ਹੋਂ',
    mr: 'मोहरी',
    te: 'ఆవాలు',
    variety: 'Pusa Bold',
    msp: 5650,
    market_price: 5780,
    source_mandi: 'Kota Agro Procurement Yard (APMC)',
    icon: '🌱',
    category: 'Oilseed',
  },
  {
    id: 'gram',
    key: 'Gram',
    en: 'Gram (Chana)',
    hi: 'चना',
    pb: 'ਛੋਲੇ',
    mr: 'हरभरा',
    te: 'శనగలు',
    variety: 'Kabuli/Desi',
    msp: 5440,
    market_price: 5590,
    source_mandi: 'Nizamabad Market Yard (APMC)',
    icon: '🌿',
    category: 'Pulses',
  },
  {
    id: 'maize',
    key: 'Maize',
    en: 'Maize',
    hi: 'मक्का',
    pb: 'ਮੱਕੀ',
    mr: 'मका',
    te: 'మొక్కజొన్న',
    variety: 'Hybrid Yellow',
    msp: 2090,
    market_price: 2150,
    source_mandi: 'Nizamabad Market Yard (APMC)',
    icon: '🌽',
    category: 'Kharif Cereal',
  },
  {
    id: 'soybean',
    key: 'Soybean',
    en: 'Soybean',
    hi: 'सोयाबीन',
    pb: 'ਸੋਇਆਬੀਨ',
    mr: 'सोयाबीन',
    te: 'సోయాబీన్',
    variety: 'JS-335',
    msp: 4600,
    market_price: 4720,
    source_mandi: 'Kota Agro Procurement Yard (APMC)',
    icon: '🌱',
    category: 'Oilseed',
  },
  {
    id: 'cotton',
    key: 'Cotton',
    en: 'Cotton',
    hi: 'कपास',
    pb: 'ਕਪਾਹ',
    mr: 'कापूस',
    te: 'పత్తి',
    variety: 'Medium Staple',
    msp: 6620,
    market_price: 6850,
    source_mandi: 'Warangal Mandi Terminal',
    icon: '☁️',
    category: 'Commercial',
  },
  {
    id: 'barley',
    key: 'Barley',
    en: 'Barley',
    hi: 'जौ',
    pb: 'ਜੌਂ',
    mr: 'जव',
    te: 'బార్లీ',
    variety: 'Malt Grade',
    msp: 1850,
    market_price: 1910,
    source_mandi: 'Karnal Mega Grain Terminal (APMC)',
    icon: '🌾',
    category: 'Rabi Cereal',
  },
  {
    id: 'groundnut',
    key: 'Groundnut',
    en: 'Groundnut',
    hi: 'मूंगफली',
    pb: 'ਮੂੰਗਫਲੀ',
    mr: 'भुईमूग',
    te: 'వేరుశనగ',
    variety: 'Bold Seed',
    msp: 6377,
    market_price: 6520,
    source_mandi: 'Rajkot Terminal Yard',
    icon: '🥜',
    category: 'Oilseed',
  },
  {
    id: 'bajra',
    key: 'Bajra',
    en: 'Bajra (Pearl Millet)',
    hi: 'बाजरा',
    pb: 'ਬਾਜਰਾ',
    mr: 'बाजरी',
    te: 'సజ్జలు',
    variety: 'Hybrid Green',
    msp: 2500,
    market_price: 2560,
    source_mandi: 'Jaipur APMC Terminal',
    icon: '🌾',
    category: 'Millets',
  },
  {
    id: 'sugarcane',
    key: 'Sugarcane',
    en: 'Sugarcane',
    hi: 'गन्ना',
    pb: 'ਗੰਨਾ',
    mr: 'ऊस',
    te: 'చెరకు',
    variety: 'Co-0238',
    msp: 315,
    market_price: 330,
    source_mandi: 'Cooperative Sugar Terminal',
    icon: '🎋',
    category: 'Commercial',
  },
];

/**
 * Returns localized crop name based on active language.
 * Strips legacy concatenated '(Hindi)' or '(English)' substrings if present.
 */
export function getCropName(cropKeyOrName, lang = 'en') {
  if (!cropKeyOrName) return '';
  const cleanInput = String(cropKeyOrName).trim();

  // Strip legacy concatenated parentheses e.g. "Wheat (गेहूं)" -> "Wheat"
  const baseName = cleanInput.split('(')[0].trim().toLowerCase();

  const found = MASTER_CROPS.find(
    (c) =>
      c.key.toLowerCase() === cleanInput.toLowerCase() ||
      c.id.toLowerCase() === cleanInput.toLowerCase() ||
      c.en.toLowerCase() === cleanInput.toLowerCase() ||
      c.hi === cleanInput ||
      c.pb === cleanInput ||
      c.en.toLowerCase().startsWith(baseName)
  );

  if (found) {
    if (lang === 'hi') return found.hi;
    if (lang === 'pb') return found.pb;
    if (lang === 'mr') return found.mr;
    if (lang === 'te') return found.te;
    return found.en;
  }

  // Fallback: If cleanInput has parenthesis e.g. "Wheat (गेहूं)", return English part for en, Hindi part for hi
  if (cleanInput.includes('(') && cleanInput.includes(')')) {
    const match = cleanInput.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      const enPart = match[1].trim();
      const otherPart = match[2].trim();
      if (lang === 'hi') return otherPart;
      return enPart;
    }
  }

  return cleanInput;
}

/**
 * Returns all crops formatted for the active language.
 */
export function getAllCropsLocalized(lang = 'en') {
  return MASTER_CROPS.map((c) => ({
    ...c,
    name: getCropName(c.key, lang),
    localized_name: getCropName(c.key, lang),
  }));
}

export const CROPS_CATALOG = MASTER_CROPS;
