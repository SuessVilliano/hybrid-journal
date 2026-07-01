/**
 * Accurate pip/point calculation per instrument type.
 *
 * FUTURES (index points):
 *   NQ, ES, YM, RTY, NKD, DAX, GC, SI, CL, NG, etc.
 *   Raw price difference IS points. 1 point = 1 index point.
 *
 * FOREX:
 *   Standard pairs (EURUSD, GBPUSD, etc.): 1 pip = 0.0001 (4th decimal)
 *   JPY pairs (USDJPY, EURJPY, etc.): 1 pip = 0.01 (2nd decimal)
 *   Fractional pairs (XAUUSD, XAGUSD): treated as pips at 4th decimal
 *
 * CRYPTO:
 *   BTC: 1 point = $1 move (price > 1000)
 *   Others (ETH, SOL, etc.): 1 point = $0.01 move → show as price diff
 *
 * Returns: { value: number, unit: 'pts' | 'pips', formatted: string }
 */

// Futures symbols — price diff = points directly
const FUTURES_SYMBOLS = [
  'NQ', 'MNQ', 'ES', 'MES', 'YM', 'MYM', 'RTY', 'M2K',
  'CL', 'MCL', 'NG', 'GC', 'MGC', 'SI', 'HG',
  'ZB', 'ZN', 'ZF', 'ZT',
  'NKD', 'DAX', 'FDAX',
  'NQZ', 'ESZ', 'NQH', 'ESH', 'NQM', 'ESM', 'NQU', 'ESU', // quarterly contracts
];

// Index CFDs (broker-style tickers) — treated as points, same as futures
const INDEX_SYMBOLS = [
  'US30', 'NAS100', 'US100', 'SPX500', 'GER30', 'UK100', 'JPN225',
  'FRA40', 'AUS200', 'ESP35', 'HKG33', 'US2000',
];

// JPY forex pairs
const JPY_PAIRS = ['JPY', 'USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY'];

// Crypto base symbols
const CRYPTO_SYMBOLS = [
  'BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'ADA', 'DOGE', 'AVAX', 'MATIC', 'DOT',
  'LINK', 'LTC', 'BCH', 'ATOM', 'UNI', 'AAVE', 'ALGO', 'FIL', 'ICP', 'NEAR'
];

export function classifySymbol(symbol) {
  if (!symbol) return 'unknown';
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Check futures first (most specific)
  if (FUTURES_SYMBOLS.some(f => s.startsWith(f) || s === f)) return 'futures';

  // Index CFDs (US30USD, NAS100USD, SPX500USD, etc.)
  if (INDEX_SYMBOLS.some(ix => s.startsWith(ix))) return 'futures';

  // Crypto check
  if (CRYPTO_SYMBOLS.some(c => s.startsWith(c))) return 'crypto';
  if (s.endsWith('USDT') || s.endsWith('USDC') || s.endsWith('BUSD') || s.endsWith('BTC')) return 'crypto';

  // JPY forex
  if (JPY_PAIRS.some(j => s.includes(j) || s === j)) return 'forex_jpy';

  // Precious metals / commodities priced as forex
  if (s.startsWith('XAU') || s.startsWith('XAG') || s.startsWith('XPT') || s.startsWith('XPD')) return 'forex';

  // Standard forex — 6-8 char currency pairs
  if (s.length >= 6 && s.length <= 8 && /^[A-Z]+$/.test(s)) return 'forex';

  // Indices / stocks
  if (s.length <= 5 && /^[A-Z]+$/.test(s)) return 'stock';

  return 'unknown';
}

export function calcPipsOrPoints(signal) {
  const { symbol, price, stop_loss, take_profits, take_profit, status, action } = signal;
  if (!price || price === 0) return null;

  const type = classifySymbol(symbol);
  // 'executed' = open trade, not a resolved win — excluded to avoid inflating gains
  const WIN_STATUSES = ['tp1_hit', 'tp2_hit', 'tp3_hit', 'full_target'];
  const isWin = WIN_STATUSES.includes(status);
  const isLoss = status === 'stopped_out';

  if (!isWin && !isLoss) return null;

  // Determine exit price
  let exitPrice = null;
  if (isWin) {
    const tps = take_profits || [];
    if (status === 'full_target') exitPrice = tps[tps.length - 1] ?? take_profit;
    else if (status === 'tp3_hit') exitPrice = tps[2] ?? take_profit;
    else if (status === 'tp2_hit') exitPrice = tps[1] ?? take_profit;
    else if (status === 'tp1_hit') exitPrice = tps[0] ?? take_profit;
  } else if (isLoss && stop_loss) {
    exitPrice = stop_loss;
  }

  if (!exitPrice) return null;

  const rawDiff = Math.abs(exitPrice - price);
  const direction = action === 'BUY' ? (exitPrice > price ? 1 : -1) : (exitPrice < price ? 1 : -1);
  const signed = isLoss ? -rawDiff : rawDiff * direction;

  if (type === 'futures') {
    return { value: signed, absValue: rawDiff, unit: 'pts', type, formatted: formatPtsOrPips(signed, 'pts') };
  }

  if (type === 'forex_jpy') {
    const pips = signed / 0.01;
    return { value: pips, absValue: rawDiff / 0.01, unit: 'pips', type, formatted: formatPtsOrPips(pips, 'pips') };
  }

  if (type === 'forex') {
    const pips = signed / 0.0001;
    return { value: pips, absValue: rawDiff / 0.0001, unit: 'pips', type, formatted: formatPtsOrPips(pips, 'pips') };
  }

  if (type === 'crypto') {
    // BTC priced > 1000, show as pts; others show as price diff
    const unit = price > 100 ? 'pts' : 'pips';
    return { value: signed, absValue: rawDiff, unit, type, formatted: formatPtsOrPips(signed, unit) };
  }

  // Stock / unknown — just raw diff
  return { value: signed, absValue: rawDiff, unit: 'pts', type, formatted: formatPtsOrPips(signed, 'pts') };
}

function formatPtsOrPips(value, unit) {
  const abs = Math.abs(value);
  const sign = value >= 0 ? '+' : '-';
  let str;
  if (unit === 'pts') {
    str = abs >= 10 ? abs.toFixed(1) : abs.toFixed(2);
  } else {
    str = abs.toFixed(1);
  }
  return `${sign}${str} ${unit}`;
}

/**
 * Aggregate pips/points from a list of resolved signals.
 * Returns { gained: number, lost: number, net: number, unit: string, winCount, lossCount }
 */
export function aggregateSignals(signals) {
  // Separate by unit — pips and points must never be summed together
  const buckets = { pts: { gained: 0, lost: 0, winCount: 0, lossCount: 0 }, pips: { gained: 0, lost: 0, winCount: 0, lossCount: 0 } };

  signals.forEach(s => {
    const result = calcPipsOrPoints(s);
    if (!result) return;
    const u = result.unit === 'pips' ? 'pips' : 'pts';
    if (result.value > 0) { buckets[u].gained += result.value; buckets[u].winCount++; }
    else if (result.value < 0) { buckets[u].lost += Math.abs(result.value); buckets[u].lossCount++; }
  });

  // Pick the dominant bucket (most resolved signals)
  const ptsTotal = buckets.pts.winCount + buckets.pts.lossCount;
  const pipsTotal = buckets.pips.winCount + buckets.pips.lossCount;
  const dominant = pipsTotal > ptsTotal ? 'pips' : 'pts';
  const b = buckets[dominant];

  return {
    gained: b.gained,
    lost: b.lost,
    net: b.gained - b.lost,
    unit: dominant,
    winCount: b.winCount,
    lossCount: b.lossCount,
    // Expose both buckets for UI that wants to show them separately
    ptsBucket: buckets.pts,
    pipsBucket: buckets.pips
  };
}

/**
 * Filter signals by time period.
 */
export function filterByPeriod(signals, period, customRange) {
  const now = new Date();
  return signals.filter(s => {
    const d = new Date(s.created_date);
    if (isNaN(d)) return false;
    switch (period) {
      case 'today': {
        return d.toDateString() === now.toDateString();
      }
      case 'week': {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      case 'month': {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      case 'year': {
        return d.getFullYear() === now.getFullYear();
      }
      case 'custom': {
        if (!customRange?.from || !customRange?.to) return true;
        const from = new Date(customRange.from); from.setHours(0,0,0,0);
        const to = new Date(customRange.to); to.setHours(23,59,59,999);
        return d >= from && d <= to;
      }
      default: return true;
    }
  });
}