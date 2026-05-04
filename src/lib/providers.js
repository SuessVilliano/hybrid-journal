// Provider metadata used everywhere we render provider chips, filter
// trades, and aggregate analytics.
//
// `key` matches the canonical provider value stored on the Trade and
// AccountSnapshot entities.

export const PROVIDERS = {
  TRADOVATE: {
    key: 'TRADOVATE',
    label: 'Tradovate',
    short: 'TV',
    color: '#6366f1',
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    darkBg: 'bg-indigo-500/15',
    darkText: 'text-indigo-300',
    symbolClass: 'futures'
  },
  DXTRADE: {
    key: 'DXTRADE',
    label: 'DXtrade',
    short: 'DX',
    color: '#0ea5e9',
    bg: 'bg-sky-100',
    text: 'text-sky-700',
    darkBg: 'bg-sky-500/15',
    darkText: 'text-sky-300',
    symbolClass: 'futures'
  },
  VOLUMETRICA: {
    key: 'VOLUMETRICA',
    label: 'Volumetrica',
    short: 'VT',
    color: '#f97316',
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    darkBg: 'bg-orange-500/15',
    darkText: 'text-orange-300',
    symbolClass: 'futures'
  },
  GOOEYPRO: {
    key: 'GOOEYPRO',
    label: 'GooeyPro',
    short: 'GP',
    color: '#10b981',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    darkBg: 'bg-emerald-500/15',
    darkText: 'text-emerald-300',
    symbolClass: 'equities'
  },
  HYBRID_FUNDING: {
    key: 'HYBRID_FUNDING',
    label: 'Hybrid Funding',
    short: 'HF',
    color: '#a855f7',
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    darkBg: 'bg-purple-500/15',
    darkText: 'text-purple-300',
    symbolClass: 'forex'
  },
  HYBRID_FUNDING_EQUITIES: {
    key: 'HYBRID_FUNDING_EQUITIES',
    label: 'Hybrid Funding Equities',
    short: 'HFE',
    color: '#22c55e',
    bg: 'bg-green-100',
    text: 'text-green-700',
    darkBg: 'bg-green-500/15',
    darkText: 'text-green-300',
    symbolClass: 'equities'
  },
  HYBRID_COPY: {
    key: 'HYBRID_COPY',
    label: 'HybridCopy',
    short: 'HC',
    color: '#06b6d4',
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
    darkBg: 'bg-cyan-500/15',
    darkText: 'text-cyan-300',
    symbolClass: 'futures'
  }
};

// Providers we explicitly want to surface as filter options / chips for
// the new HybridCopy integrations.
export const HYBRIDCOPY_PROVIDERS = [
  PROVIDERS.TRADOVATE,
  PROVIDERS.DXTRADE,
  PROVIDERS.VOLUMETRICA,
  PROVIDERS.GOOEYPRO,
  PROVIDERS.HYBRID_FUNDING_EQUITIES
];

const ALIASES = {
  TRADOVATE: ['Tradovate', 'tradovate', 'TV'],
  DXTRADE: ['DXTrade', 'DXtrade', 'dxtrade', 'DX'],
  VOLUMETRICA: ['Volumetrica', 'volumetrica', 'dxFeed', 'VT'],
  GOOEYPRO: ['GooeyPro', 'gooeypro', 'GP'],
  HYBRID_FUNDING: ['HybridFunding', 'hybridfunding', 'Hybrid Funding'],
  HYBRID_FUNDING_EQUITIES: ['HybridFundingEquities', 'Hybrid Funding Equities'],
  HYBRID_COPY: ['HybridCopy', 'hybridcopy', 'Hybrid Copy']
};

export function getProvider(trade) {
  if (!trade) return null;

  const candidates = [trade.provider, trade.source, trade.platform];
  for (const c of candidates) {
    if (!c) continue;
    const upper = c.toString().toUpperCase().replace(/\s+/g, '_');
    if (PROVIDERS[upper]) return PROVIDERS[upper];

    for (const [key, names] of Object.entries(ALIASES)) {
      if (names.some((n) => n.toUpperCase() === c.toString().toUpperCase())) {
        return PROVIDERS[key];
      }
    }
  }
  return null;
}

export function getSymbolClass(trade) {
  if (!trade) return 'unknown';
  if (trade.symbol_class) return trade.symbol_class;
  const provider = getProvider(trade);
  if (provider?.symbolClass) return provider.symbolClass;
  if (trade.instrument_type === 'Futures') return 'futures';
  if (trade.instrument_type === 'Stocks' || trade.instrument_type === 'Equities') return 'equities';
  if (trade.instrument_type === 'Forex') return 'forex';
  if (trade.instrument_type === 'Crypto') return 'crypto';
  return 'unknown';
}

export function isHybridCopySynced(trade) {
  if (!trade) return false;
  if (trade.synced_from_hybridcopy) return true;
  const provider = getProvider(trade);
  if (!provider) return false;
  return [
    'TRADOVATE',
    'DXTRADE',
    'VOLUMETRICA',
    'GOOEYPRO',
    'HYBRID_FUNDING',
    'HYBRID_FUNDING_EQUITIES',
    'HYBRID_COPY'
  ].includes(provider.key);
}

export const HYBRIDCOPY_BASE_URL = 'https://hybridcopy.co';

export function hybridCopyTradeLink(trade) {
  if (!trade) return null;
  if (trade.hybridcopy_link) return trade.hybridcopy_link;
  const provider = getProvider(trade);
  if (!provider || !trade.source_trade_id) return null;
  return `${HYBRIDCOPY_BASE_URL}/trades/${provider.key}/${encodeURIComponent(trade.source_trade_id)}`;
}
