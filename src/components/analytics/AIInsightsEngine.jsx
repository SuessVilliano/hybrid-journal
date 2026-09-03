import { base44 } from '@/api/base44Client';
import { calculateTradeStats, normalizeTrades } from '@/lib/tradingAnalytics';

function calculateContextStats(trades = []) {
  const normalized = normalizeTrades(trades);
  const core = calculateTradeStats(normalized);
  if (!core) return null;

  const winningTrades = normalized.filter((t) => t.pnl > 0);
  const losingTrades = normalized.filter((t) => t.pnl < 0);

  const symbolCounts = normalized.reduce((acc, t) => {
    const key = t.symbol || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const strategyCounts = normalized.reduce((acc, t) => {
    if (t.strategy) acc[t.strategy] = (acc[t.strategy] || 0) + 1;
    return acc;
  }, {});

  const instrumentCounts = normalized.reduce((acc, t) => {
    if (t.instrument_type) acc[t.instrument_type] = (acc[t.instrument_type] || 0) + 1;
    return acc;
  }, {});

  const emotionCounts = normalized.reduce((acc, t) => {
    if (t.emotion_before) acc[t.emotion_before] = (acc[t.emotion_before] || 0) + 1;
    return acc;
  }, {});

  const longTrades = normalized.filter((t) => String(t.side).toLowerCase() === 'long').length;
  const shortTrades = normalized.filter((t) => String(t.side).toLowerCase() === 'short').length;
  const topEmotionBefore = Object.entries(emotionCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
  const emotionSample = normalized.filter((t) => t.emotion_before === topEmotionBefore);
  const emotionWins = emotionSample.filter((t) => t.pnl > 0).length;

  return {
    ...core,
    largestWin: winningTrades.length ? Math.max(...winningTrades.map((t) => t.pnl)) : 0,
    largestLoss: losingTrades.length ? Math.min(...losingTrades.map((t) => t.pnl)) : 0,
    topSymbols: Object.entries(symbolCounts).sort(([, a], [, b]) => b - a).map(([symbol]) => symbol),
    topStrategy: Object.entries(strategyCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A',
    topInstrument: Object.entries(instrumentCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A',
    sideBias: longTrades === shortTrades ? 'Balanced' : longTrades > shortTrades ? 'Long' : 'Short',
    topEmotionBefore,
    emotionWinCorrelation: emotionSample.length ? `${((emotionWins / emotionSample.length) * 100).toFixed(1)}%` : 'N/A',
  };
}

export async function generateAIInsights(trades, strategies) {
  try {
    const stats = calculateContextStats(trades);
    if (!stats) return null;

    const prompt = `Analyze this trading performance data and provide comprehensive insights. Treat these canonical metrics as authoritative and do not recalculate them differently.

PERFORMANCE METRICS:
- Total realized trades: ${stats.totalTrades}
- Decided trades: ${stats.decidedTrades}
- Breakeven trades: ${stats.breakevenTrades}
- Win Rate (wins / wins+losses): ${stats.winRate.toFixed(1)}%
- Total P&L: $${stats.totalPnl.toFixed(2)}
- Net P&L after recorded fees: $${stats.netPnl.toFixed(2)}
- Profit Factor: ${stats.profitFactor === Infinity ? 'Infinity (no recorded losses)' : stats.profitFactor.toFixed(2)}
- Expectancy: $${stats.expectancy.toFixed(2)} per decided trade
- Average Win: $${stats.avgWin.toFixed(2)}
- Average Loss: $${stats.avgLoss.toFixed(2)}
- Payoff Ratio: ${stats.payoffRatio === Infinity ? 'Infinity' : stats.payoffRatio.toFixed(2)}
- Max Drawdown: $${stats.maxDrawdown.toFixed(2)}
- Largest Win: $${stats.largestWin.toFixed(2)}
- Largest Loss: $${stats.largestLoss.toFixed(2)}

TRADING PATTERNS:
- Most traded symbols: ${stats.topSymbols.slice(0, 3).join(', ')}
- Most used strategy: ${stats.topStrategy}
- Primary instrument type: ${stats.topInstrument}
- Preferred side: ${stats.sideBias}

EMOTIONAL ANALYSIS:
- Most common pre-trade emotion: ${stats.topEmotionBefore}
- Win rate for that emotion sample: ${stats.emotionWinCorrelation}

Provide analysis in these categories:
1. STRENGTHS: 2-3 data-supported points
2. WEAKNESSES: 2-3 data-supported points
3. PATTERNS: 2-3 profitable or unprofitable patterns worth testing
4. RISKS: 2-3 warnings, especially drawdown/sample-size concerns
5. RECOMMENDATIONS: 3-4 specific next actions

Do not imply causation from small samples. Be concise, specific, and data-driven.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
    });

    return parseInsights(result);
  } catch (error) {
    console.error('AI insights error:', error);
    return null;
  }
}

export async function identifyProfitablePatterns(trades) {
  try {
    const normalized = normalizeTrades(trades);
    const winningTrades = normalized.filter((t) => t.pnl > 0);
    const losingTrades = normalized.filter((t) => t.pnl < 0);

    const prompt = `Analyze these realized trading samples for recurring patterns. Do not call a pattern reliable unless the sample supports it.

WINNING TRADE SAMPLE:
${JSON.stringify(winningTrades.slice(0, 30).map((t) => ({
  symbol: t.symbol,
  strategy: t.strategy,
  side: t.side,
  emotion: t.emotion_before,
  pnl: t.pnl,
  r_multiple: t.rMultiple,
  followed_rules: t.followed_rules,
})))}

LOSING TRADE SAMPLE:
${JSON.stringify(losingTrades.slice(0, 30).map((t) => ({
  symbol: t.symbol,
  strategy: t.strategy,
  side: t.side,
  emotion: t.emotion_before,
  pnl: t.pnl,
  r_multiple: t.rMultiple,
  followed_rules: t.followed_rules,
})))}

Identify up to 5 patterns worth testing. For each return a name, description, estimated win rate only when calculable from the supplied sample, confidence note, and actionable advice.`;

    const schema = {
      type: 'object',
      properties: {
        patterns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              winRate: { type: 'number' },
              confidence: { type: 'string' },
              advice: { type: 'string' },
            },
          },
        },
      },
    };

    const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
    return result.patterns || [];
  } catch (error) {
    console.error('Pattern analysis error:', error);
    return [];
  }
}

export async function analyzeEmotionalImpact(trades) {
  try {
    const normalized = normalizeTrades(trades);
    const emotionData = normalized.reduce((acc, trade) => {
      const emotion = trade.emotion_before || 'Unknown';
      if (!acc[emotion]) acc[emotion] = { wins: 0, losses: 0, breakevens: 0, totalPnl: 0, count: 0 };
      acc[emotion].count += 1;
      acc[emotion].totalPnl += trade.pnl;
      if (trade.pnl > 0) acc[emotion].wins += 1;
      else if (trade.pnl < 0) acc[emotion].losses += 1;
      else acc[emotion].breakevens += 1;
      return acc;
    }, {});

    const prompt = `Analyze how pre-trade emotions are associated with performance. This is observational data, so describe associations rather than claiming emotions caused results.

${Object.entries(emotionData).map(([emotion, stats]) => {
  const decided = stats.wins + stats.losses;
  const winRate = decided ? (stats.wins / decided) * 100 : 0;
  return `${emotion}: ${stats.count} trades, ${stats.wins}W/${stats.losses}L/${stats.breakevens}BE, ${winRate.toFixed(1)}% decided-trade win rate, $${stats.totalPnl.toFixed(2)} P&L`;
}).join('\n')}

Provide the strongest positive and negative associations, sample-size cautions, and specific emotional-management practices.`;

    const result = await base44.integrations.Core.InvokeLLM({ prompt, add_context_from_internet: false });
    return { emotionData, analysis: result };
  } catch (error) {
    console.error('Emotional analysis error:', error);
    return null;
  }
}

export async function predictRisks(trades, recentTrades) {
  try {
    const recentStats = calculateTradeStats((recentTrades || []).slice(0, 10));
    const overallStats = calculateTradeStats(trades || []);
    if (!recentStats || !overallStats) return [];

    const prompt = `Compare recent realized trading behavior with the trader's overall baseline and identify potential risk warnings.

RECENT SAMPLE:
- Trades: ${recentStats.totalTrades}
- Win Rate: ${recentStats.winRate.toFixed(1)}%
- P&L: $${recentStats.totalPnl.toFixed(2)}
- Expectancy: $${recentStats.expectancy.toFixed(2)}
- Max Drawdown: $${recentStats.maxDrawdown.toFixed(2)}
- Max Losing Streak: ${recentStats.maxLossStreak}

OVERALL BASELINE:
- Trades: ${overallStats.totalTrades}
- Win Rate: ${overallStats.winRate.toFixed(1)}%
- P&L: $${overallStats.totalPnl.toFixed(2)}
- Expectancy: $${overallStats.expectancy.toFixed(2)}
- Max Drawdown: $${overallStats.maxDrawdown.toFixed(2)}

Identify 3-5 potential risks. Separate genuine deterioration from normal variance when the recent sample is small. Return risk level, description, evidence, and mitigation.`;

    const schema = {
      type: 'object',
      properties: {
        risks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              level: { type: 'string' },
              description: { type: 'string' },
              evidence: { type: 'string' },
              mitigation: { type: 'string' },
            },
          },
        },
      },
    };

    const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
    return result.risks || [];
  } catch (error) {
    console.error('Risk prediction error:', error);
    return [];
  }
}

function parseInsights(text) {
  const sections = { strengths: [], weaknesses: [], patterns: [], risks: [], recommendations: [] };
  const lines = String(text || '').split('\n');
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toUpperCase().includes('STRENGTH')) currentSection = 'strengths';
    else if (trimmed.toUpperCase().includes('WEAKNESS')) currentSection = 'weaknesses';
    else if (trimmed.toUpperCase().includes('PATTERN')) currentSection = 'patterns';
    else if (trimmed.toUpperCase().includes('RISK')) currentSection = 'risks';
    else if (trimmed.toUpperCase().includes('RECOMMENDATION')) currentSection = 'recommendations';
    else if (currentSection && trimmed && (trimmed.match(/^[-•*\d]/) || trimmed.length > 20)) {
      sections[currentSection].push(trimmed.replace(/^[-•*\d.)\s]+/, ''));
    }
  }

  return sections;
}
