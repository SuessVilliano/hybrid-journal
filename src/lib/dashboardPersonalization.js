const hasText = (items = [], needle) => items.some((item) => String(item).toLowerCase().includes(needle));

export function deriveDashboardPersonalization(profile = {}) {
  const goals = profile.primary_goals || [];
  const challenges = profile.main_challenges || [];
  const markets = profile.primary_markets || [];
  const sessions = profile.trading_session || [];

  const propFocused = Boolean(profile.prop_firm_trader || hasText(goals, 'prop firm'));
  const riskFocused = hasText(goals, 'risk') || hasText(challenges, 'risk') || hasText(challenges, 'revenge') || hasText(challenges, 'overtrading');
  const psychologyFocused = hasText(goals, 'emotional') || hasText(challenges, 'fear') || hasText(challenges, 'discipline');

  const widgets = [
    'pnl',
    'winRate',
    'profitFactor',
    'avgWin',
    'hybridScore',
    'equityCurve',
    'recentTrades',
    'performance',
  ];

  if (riskFocused && !widgets.includes('avgLoss')) widgets.push('avgLoss');
  if (psychologyFocused && !widgets.includes('emotionalPatterns')) widgets.push('emotionalPatterns');
  if (propFocused && !widgets.includes('fundingReadiness')) widgets.push('fundingReadiness');

  return {
    widgets,
    analytics_trust_filter: 'executions',
    show_data_trust: true,
    show_funding_readiness: propFocused,
    personalization_version: 'flagship-v1',
    primary_goal: goals[0] || '',
    primary_market: markets[0] || '',
    primary_session: sessions[0] || '',
    risk_focus: riskFocused ? 'risk-discipline' : psychologyFocused ? 'psychology-discipline' : 'balanced',
    default_timeframe: profile.trader_type === 'Scalper' || profile.trader_type === 'Day Trader' ? '30d' : '90d',
  };
}

export function buildPersonalizedWelcome(profile = {}) {
  const name = profile.preferred_name || 'Trader';
  const market = profile.primary_markets?.[0];
  const goal = profile.primary_goals?.[0];

  return {
    title: `Welcome back, ${name}`,
    subtitle: market && goal
      ? `Your ${market} dashboard is prioritized around: ${goal}.`
      : market
        ? `Your dashboard is tuned for ${market}.`
        : goal
          ? `Your dashboard is prioritized around: ${goal}.`
          : 'Track the evidence behind your trading edge.',
  };
}
