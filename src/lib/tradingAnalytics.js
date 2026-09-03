import { summarizeTradeProvenance } from '@/lib/tradeProvenance';

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const tradeTimestamp = (trade) =>
  trade?.exit_date || trade?.closed_at || trade?.entry_date || trade?.created_date || null;

export function isRealizedTrade(trade) {
  if (!trade) return false;
  const pnl = Number(trade.pnl);
  return Number.isFinite(pnl);
}

export function normalizeTrades(trades = []) {
  return trades
    .filter(isRealizedTrade)
    .map((trade, index) => ({
      ...trade,
      pnl: toNumber(trade.pnl),
      fees: toNumber(trade.fees ?? trade.commission ?? trade.commissions),
      rMultiple: Number.isFinite(Number(trade.r_multiple)) ? Number(trade.r_multiple) : null,
      _analyticsIndex: index,
      _analyticsTimestamp: tradeTimestamp(trade),
    }));
}

function calculateDrawdown(trades) {
  const ordered = [...trades].sort((a, b) => {
    const aTime = a._analyticsTimestamp ? new Date(a._analyticsTimestamp).getTime() : a._analyticsIndex;
    const bTime = b._analyticsTimestamp ? new Date(b._analyticsTimestamp).getTime() : b._analyticsIndex;
    return aTime - bTime;
  });

  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let currentDrawdown = 0;
  let maxDrawdownPct = 0;

  ordered.forEach((trade) => {
    equity += trade.pnl;
    peak = Math.max(peak, equity);
    currentDrawdown = Math.max(0, peak - equity);
    maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
    if (peak > 0) maxDrawdownPct = Math.max(maxDrawdownPct, (currentDrawdown / peak) * 100);
  });

  return { maxDrawdown, maxDrawdownPct, currentDrawdown, endingEquity: equity };
}

function calculateStreaks(trades) {
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  trades.forEach((trade) => {
    if (trade.pnl > 0) {
      currentWinStreak += 1;
      currentLossStreak = 0;
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
    } else if (trade.pnl < 0) {
      currentLossStreak += 1;
      currentWinStreak = 0;
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
    }
  });

  return { maxWinStreak, maxLossStreak };
}

export function calculateTradeStats(inputTrades = []) {
  const trades = normalizeTrades(inputTrades);
  if (!trades.length) return null;

  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl < 0);
  const breakevenTrades = trades.filter((t) => t.pnl === 0);
  const decidedTrades = winningTrades.length + losingTrades.length;

  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const totalFees = trades.reduce((sum, t) => sum + t.fees, 0);
  const netPnl = totalPnl - totalFees;

  const avgWin = winningTrades.length ? grossProfit / winningTrades.length : 0;
  const avgLoss = losingTrades.length ? grossLoss / losingTrades.length : 0;
  const winRate = decidedTrades ? (winningTrades.length / decidedTrades) * 100 : 0;
  const lossRate = decidedTrades ? (losingTrades.length / decidedTrades) * 100 : 0;
  const breakevenRate = trades.length ? (breakevenTrades.length / trades.length) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  const expectancy = decidedTrades
    ? (winRate / 100) * avgWin - (lossRate / 100) * avgLoss
    : 0;

  const rTrades = trades.filter((t) => t.rMultiple !== null);
  const averageR = rTrades.length
    ? rTrades.reduce((sum, t) => sum + t.rMultiple, 0) / rTrades.length
    : null;

  const { maxDrawdown, maxDrawdownPct, currentDrawdown, endingEquity } = calculateDrawdown(trades);
  const { maxWinStreak, maxLossStreak } = calculateStreaks(trades);
  const provenance = summarizeTradeProvenance(trades);

  return {
    totalTrades: trades.length,
    decidedTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakevenTrades: breakevenTrades.length,
    winRate,
    lossRate,
    breakevenRate,
    grossProfit,
    grossLoss,
    totalPnl,
    totalFees,
    netPnl,
    avgWin,
    avgLoss,
    profitFactor,
    payoffRatio,
    expectancy,
    averageR,
    maxDrawdown,
    maxDrawdownPct,
    currentDrawdown,
    endingEquity,
    maxWinStreak,
    maxLossStreak,
    provenance,
  };
}

export function groupTradeStats(inputTrades = [], keySelector) {
  const normalized = normalizeTrades(inputTrades);
  const groups = new Map();

  normalized.forEach((trade) => {
    const rawKey = typeof keySelector === 'function' ? keySelector(trade) : trade?.[keySelector];
    const key = rawKey || 'Unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(trade);
  });

  return Array.from(groups.entries()).map(([name, trades]) => ({
    name,
    ...calculateTradeStats(trades),
  }));
}

function scoreByThreshold(value, thresholds) {
  let score = 0;
  thresholds.forEach(([minimum, points]) => {
    if (value >= minimum) score = Math.max(score, points);
  });
  return score;
}

export function calculateHybridScore(inputTrades = []) {
  const stats = calculateTradeStats(inputTrades);
  if (!stats) return null;

  const trades = normalizeTrades(inputTrades);
  const sampleSize = stats.totalTrades;

  const edge = clamp(
    scoreByThreshold(stats.profitFactor === Infinity ? 10 : stats.profitFactor, [
      [0, 15], [1, 35], [1.25, 55], [1.5, 70], [2, 85], [3, 100],
    ]) * 0.55 +
    scoreByThreshold(stats.expectancy, [
      [-Infinity, 10], [0, 45], [25, 60], [50, 75], [100, 90], [200, 100],
    ]) * 0.45
  );

  const consistency = clamp(
    scoreByThreshold(stats.winRate, [
      [0, 20], [35, 35], [45, 50], [50, 65], [55, 75], [60, 85], [70, 100],
    ]) * 0.65 +
    clamp(100 - stats.maxLossStreak * 8) * 0.35
  );

  const risk = clamp(
    (stats.maxDrawdownPct > 0
      ? clamp(100 - stats.maxDrawdownPct * 3)
      : clamp(100 - (stats.maxDrawdown / Math.max(Math.abs(stats.grossProfit), 1)) * 100)) * 0.7 +
    clamp(100 - stats.maxLossStreak * 7) * 0.3
  );

  const hasRiskData = trades.filter((t) => t.rMultiple !== null).length;
  const discipline = clamp(
    (stats.payoffRatio === Infinity ? 100 : clamp(stats.payoffRatio * 45)) * 0.55 +
    clamp(100 - stats.breakevenRate) * 0.15 +
    clamp(100 - Math.max(0, stats.maxLossStreak - 2) * 10) * 0.3
  );

  const sampleScore = clamp((sampleSize / 100) * 100);
  const rCoverage = sampleSize ? (hasRiskData / sampleSize) * 100 : 0;
  const sourceConfidence = stats.provenance?.dataConfidence || 0;
  const verificationRate = stats.provenance?.verificationRate || 0;
  const dataConfidence = clamp(
    sampleScore * 0.40 +
    sourceConfidence * 0.35 +
    verificationRate * 0.15 +
    rCoverage * 0.10
  );

  const rawScore = edge * 0.30 + risk * 0.25 + consistency * 0.20 + discipline * 0.15 + dataConfidence * 0.10;
  const confidenceMultiplier = 0.6 + (dataConfidence / 100) * 0.4;
  const totalScore = Math.round(clamp(rawScore * confidenceMultiplier));

  let level = 'Building Baseline';
  if (totalScore >= 85) level = 'Elite';
  else if (totalScore >= 75) level = 'Advanced';
  else if (totalScore >= 60) level = 'Developing Edge';
  else if (totalScore >= 45) level = 'Emerging';

  return {
    totalScore,
    level,
    components: {
      edge: Math.round(edge),
      risk: Math.round(risk),
      consistency: Math.round(consistency),
      discipline: Math.round(discipline),
      dataConfidence: Math.round(dataConfidence),
    },
    stats,
    sampleSize,
  };
}

export function formatMetric(value, digits = 2) {
  if (value === Infinity) return '∞';
  if (!Number.isFinite(Number(value))) return '—';
  return Number(value).toFixed(digits);
}
