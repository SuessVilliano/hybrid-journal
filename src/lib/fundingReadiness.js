import { calculateHybridScore, calculateTradeStats } from '@/lib/tradingAnalytics';

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function drawdownScore(stats) {
  if (!stats) return 0;
  if (stats.maxDrawdownPct > 0) return clamp(100 - stats.maxDrawdownPct * 4);
  if (stats.grossProfit <= 0) return 20;
  return clamp(100 - (stats.maxDrawdown / Math.max(stats.grossProfit, 1)) * 120);
}

function consistencyScore(stats) {
  if (!stats) return 0;
  const streakPenalty = Math.max(0, stats.maxLossStreak - 2) * 8;
  const edgeBase = stats.profitFactor >= 1.5 ? 85 : stats.profitFactor >= 1.2 ? 70 : stats.profitFactor >= 1 ? 55 : 30;
  return clamp(edgeBase - streakPenalty);
}

export function calculateFundingReadiness(trades = [], traderProfile = null) {
  const stats = calculateTradeStats(trades);
  const hybrid = calculateHybridScore(trades);

  if (!stats || !hybrid) {
    return {
      score: 0,
      level: 'Collecting Data',
      status: 'baseline',
      headline: 'Build your trading baseline',
      description: 'Log or sync at least 20 realized trades so Hybrid can evaluate funding readiness with meaningful confidence.',
      reasons: ['Not enough realized trade data yet'],
      nextActions: ['Connect a broker or import trade history', 'Reach at least 20 realized trades'],
    };
  }

  const sampleScore = clamp((stats.totalTrades / 50) * 100);
  const provenanceScore = stats.provenance?.dataConfidence || 0;
  const verifiedRate = stats.provenance?.verificationRate || 0;
  const edgeScore = clamp(
    (stats.profitFactor >= 2 ? 100 : stats.profitFactor >= 1.5 ? 85 : stats.profitFactor >= 1.25 ? 70 : stats.profitFactor >= 1 ? 55 : 25) * 0.6 +
    (stats.expectancy > 0 ? clamp(55 + Math.min(stats.expectancy, 200) / 4) : 25) * 0.4
  );
  const riskScore = drawdownScore(stats);
  const consistency = consistencyScore(stats);

  const profileIntent = Boolean(
    traderProfile?.prop_firm_trader ||
    traderProfile?.primary_goals?.some?.((goal) => String(goal).toLowerCase().includes('prop firm'))
  );

  const raw =
    edgeScore * 0.28 +
    riskScore * 0.24 +
    consistency * 0.18 +
    sampleScore * 0.12 +
    provenanceScore * 0.10 +
    verifiedRate * 0.08;

  const score = Math.round(clamp(raw));
  const reasons = [];
  const nextActions = [];

  if (stats.totalTrades < 30) {
    reasons.push(`Only ${stats.totalTrades} realized trades are available, so confidence is still developing.`);
    nextActions.push('Build a 30+ trade sample before increasing capital exposure.');
  }
  if (verifiedRate < 50) {
    reasons.push(`${verifiedRate.toFixed(0)}% of the dataset is broker/API verified.`);
    nextActions.push('Connect a supported broker or execution source to strengthen verification.');
  }
  if (stats.profitFactor < 1.25) {
    reasons.push(`Profit factor is ${Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'}, below the preferred readiness range.`);
    nextActions.push('Improve payoff quality or reduce avoidable losing trades before scaling.');
  }
  if (stats.expectancy <= 0) {
    reasons.push('Current expectancy is not positive.');
    nextActions.push('Identify the highest-expectancy setups and reduce low-quality trades.');
  }
  if (stats.maxLossStreak >= 5) {
    reasons.push(`Maximum losing streak is ${stats.maxLossStreak} trades.`);
    nextActions.push('Tighten daily loss limits and post-loss execution rules.');
  }
  if (stats.maxDrawdownPct > 10) {
    reasons.push(`Observed maximum drawdown is ${stats.maxDrawdownPct.toFixed(1)}%.`);
    nextActions.push('Lower risk per trade until drawdown behavior stabilizes.');
  }

  if (!reasons.length) {
    reasons.push('Positive expectancy, controlled drawdown, and sufficient consistency are present in the current dataset.');
  }

  if (!nextActions.length) {
    nextActions.push('Review available funding structures against your risk profile before choosing an account.');
  }

  let level = 'Not Ready Yet';
  let status = 'developing';
  let headline = 'Keep building your edge';
  let description = 'Your data shows progress, but more evidence or tighter risk behavior would improve funding readiness.';

  if (score >= 80 && stats.totalTrades >= 30 && stats.expectancy > 0 && stats.profitFactor >= 1.25) {
    level = 'Funding Ready';
    status = 'ready';
    headline = profileIntent ? 'Your data supports exploring a funded account' : 'Your trading profile is approaching capital-readiness';
    description = 'Hybrid sees a sufficiently strong combination of edge, risk control, consistency, and data confidence to explore funding options. This is an analytics assessment, not a guarantee of passing an evaluation.';
  } else if (score >= 65) {
    level = 'Almost Ready';
    status = 'close';
    headline = 'You are approaching funding readiness';
    description = 'A few measurable improvements could move your profile into the funding-ready range.';
  } else if (score < 45) {
    level = 'Build First';
    status = 'baseline';
    headline = 'Focus on consistency before adding capital pressure';
    description = 'Your journal can help isolate the setups and behaviors worth keeping before you take on funding rules.';
  }

  return {
    score,
    level,
    status,
    headline,
    description,
    reasons,
    nextActions,
    metrics: {
      edge: Math.round(edgeScore),
      risk: Math.round(riskScore),
      consistency: Math.round(consistency),
      sample: Math.round(sampleScore),
      provenance: Math.round(provenanceScore),
      verifiedRate: Math.round(verifiedRate),
      hybridScore: hybrid.totalScore,
    },
  };
}
