/**
 * Symbol Registry — Curated high-liquidity instruments
 * 
 * Each symbol maps to its macro benchmarks so the QQE Engine
 * can pull the right data regardless of instrument type.
 */

export const CURATED_SYMBOLS = {
  // ═══ INDEX FUTURES ═══
  'MNQ': {
    name: 'Micro Nasdaq-100',
    instrument_type: 'Futures',
    yahoo_symbol: 'NQ=F',
    benchmarks: ['VIX', 'DXY', '10Y', '2Y', 'Fed Balance Sheet'],
    description: 'Tech-heavy index, sensitive to yields and AI narrative',
    default_bible_hint: 'Overnight sweep reversals, ORB, pullback into trend'
  },
  'NQ': {
    name: 'Nasdaq-100 Futures',
    instrument_type: 'Futures',
    yahoo_symbol: 'NQ=F',
    benchmarks: ['VIX', 'DXY', '10Y', '2Y', 'Fed Balance Sheet'],
    description: 'Full-size Nasdaq futures, same drivers as MNQ',
    default_bible_hint: 'Overnight sweep reversals, ORB, pullback into trend'
  },
  'ES': {
    name: 'E-Mini S&P 500',
    instrument_type: 'Futures',
    yahoo_symbol: 'ES=F',
    benchmarks: ['VIX', 'DXY', '10Y', '2Y'],
    description: 'Broad market index, sensitive to macro and Fed policy',
    default_bible_hint: 'Sweep and reverse, trend continuation, range breaks'
  },
  'MES': {
    name: 'Micro E-Mini S&P 500',
    instrument_type: 'Futures',
    yahoo_symbol: 'ES=F',
    benchmarks: ['VIX', 'DXY', '10Y', '2Y'],
    description: 'Micro S&P 500 futures',
    default_bible_hint: 'Same as ES — sweep reversals, ORB'
  },
  'YM': {
    name: 'Dow Jones Futures',
    instrument_type: 'Futures',
    yahoo_symbol: 'YM=F',
    benchmarks: ['VIX', 'DXY', '10Y'],
    description: 'Industrial-heavy index',
    default_bible_hint: 'Trend following, gap fills'
  },
  'RTY': {
    name: 'Russell 2000 Futures',
    instrument_type: 'Futures',
    yahoo_symbol: 'RTY=F',
    benchmarks: ['VIX', 'DXY', '10Y'],
    description: 'Small-cap index, risk-on/risk-off proxy',
    default_bible_hint: 'Risk-on confirmation, breakout continuations'
  },

  // ═══ FOREX ═══
  'EURUSD': {
    name: 'Euro / US Dollar',
    instrument_type: 'Forex',
    yahoo_symbol: 'EURUSD=X',
    benchmarks: ['DXY', '10Y', '2Y', 'Eurozone 10Y'],
    description: 'Most liquid forex pair, driven by rate differentials',
    default_bible_hint: 'London session sweeps, NY session reversals'
  },
  'GBPUSD': {
    name: 'British Pound / US Dollar',
    instrument_type: 'Forex',
    yahoo_symbol: 'GBPUSD=X',
    benchmarks: ['DXY', '10Y', '2Y', 'UK 10Y'],
    description: 'Cable — volatile, driven by BoE and risk sentiment',
    default_bible_hint: 'London open momentum, pullback reversals'
  },
  'USDJPY': {
    name: 'US Dollar / Japanese Yen',
    instrument_type: 'Forex',
    yahoo_symbol: 'USDJPY=X',
    benchmarks: ['10Y', '2Y', 'JGB 10Y', 'DXY'],
    description: 'Carry trade proxy, extremely yield-sensitive',
    default_bible_hint: 'Yield-driven trend following, carry unwind detection'
  },
  'AUDUSD': {
    name: 'Australian Dollar / US Dollar',
    instrument_type: 'Forex',
    yahoo_symbol: 'AUDUSD=X',
    benchmarks: ['DXY', 'China data', 'Commodities', '10Y'],
    description: 'Risk proxy, China-dependent',
    default_bible_hint: 'Risk-on correlation, commodity-driven reversals'
  },

  // ═══ COMMODITIES ═══
  'GC': {
    name: 'Gold Futures',
    instrument_type: 'Commodities',
    yahoo_symbol: 'GC=F',
    benchmarks: ['DXY', '10Y', 'VIX', 'Real Yields'],
    description: 'Safe haven, inverse dollar correlation',
    default_bible_hint: 'Dollar-driven reversals, safe haven flows'
  },
  'CL': {
    name: 'Crude Oil Futures',
    instrument_type: 'Commodities',
    yahoo_symbol: 'CL=F',
    benchmarks: ['DXY', 'OPEC', 'VIX', 'Inventory Data'],
    description: 'Supply/demand driven, geopolitical sensitivity',
    default_bible_hint: 'Inventory report plays, trend continuation'
  },

  // ═══ CRYPTO ═══
  'BTCUSD': {
    name: 'Bitcoin / USD',
    instrument_type: 'Crypto',
    yahoo_symbol: 'BTC-USD',
    benchmarks: ['Crypto Fear & Greed', 'DXY', '10Y', 'Nasdaq Correlation'],
    description: 'Digital gold narrative, risk-on proxy',
    default_bible_hint: 'Liquidity sweep reversals, weekend gap fills'
  },
  'ETHUSD': {
    name: 'Ethereum / USD',
    instrument_type: 'Crypto',
    yahoo_symbol: 'ETH-USD',
    benchmarks: ['Crypto Fear & Greed', 'DXY', 'BTC Correlation', '10Y'],
    description: 'Beta to BTC, tech-sensitive',
    default_bible_hint: 'BTC-led moves, ETH/BTC ratio divergences'
  }
};

export const SYMBOL_CATEGORIES = {
  'Index Futures': ['MNQ', 'NQ', 'ES', 'MES', 'YM', 'RTY'],
  'Forex': ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'],
  'Commodities': ['GC', 'CL'],
  'Crypto': ['BTCUSD', 'ETHUSD']
};

export function getSymbolInfo(symbol) {
  return CURATED_SYMBOLS[symbol?.toUpperCase()] || null;
}

export function getAllSymbols() {
  return Object.keys(CURATED_SYMBOLS);
}