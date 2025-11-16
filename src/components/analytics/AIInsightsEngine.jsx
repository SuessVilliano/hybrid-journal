import { base44 } from '@/api/base44Client';

// Generate comprehensive AI insights
export async function generateAIInsights(trades, strategies) {
  try {
    const stats = calculateTradeStats(trades);
    
    const prompt = `Analyze this trading performance data and provide comprehensive insights:

PERFORMANCE METRICS:
- Total Trades: ${stats.totalTrades}
- Win Rate: ${stats.winRate.toFixed(1)}%
- Total P&L: $${stats.totalPnl.toFixed(2)}
- Profit Factor: ${stats.profitFactor.toFixed(2)}
- Average Win: $${stats.avgWin.toFixed(2)}
- Average Loss: $${stats.avgLoss.toFixed(2)}
- Largest Win: $${stats.largestWin.toFixed(2)}
- Largest Loss: $${stats.largestLoss.toFixed(2)}

TRADING PATTERNS:
- Most traded symbols: ${stats.topSymbols.slice(0, 3).join(', ')}
- Most used strategy: ${stats.topStrategy}
- Primary instrument type: ${stats.topInstrument}
- Preferred side: ${stats.sideBias}

EMOTIONAL ANALYSIS:
- Most common emotion before trading: ${stats.topEmotionBefore}
- Emotion correlation with wins: ${stats.emotionWinCorrelation}

Provide analysis in these categories:
1. STRENGTHS: What's working well (2-3 points)
2. WEAKNESSES: Areas needing improvement (2-3 points)
3. PATTERNS: Profitable patterns identified (2-3 specific patterns)
4. RISKS: Potential risks and red flags (2-3 warnings)
5. RECOMMENDATIONS: Specific actionable advice (3-4 recommendations)

Be specific, data-driven, and actionable. Keep each point concise.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    return parseInsights(result);
  } catch (error) {
    console.error('AI insights error:', error);
    return null;
  }
}

// Identify profitable patterns
export async function identifyProfitablePatterns(trades) {
  try {
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    const prompt = `Analyze these trading patterns to identify what consistently leads to profitable trades:

WINNING TRADES CHARACTERISTICS:
${JSON.stringify(winningTrades.slice(0, 20).map(t => ({
  symbol: t.symbol,
  strategy: t.strategy,
  side: t.side,
  emotion: t.emotion_before,
  pnl: t.pnl,
  followed_rules: t.followed_rules
})))}

LOSING TRADES CHARACTERISTICS:
${JSON.stringify(losingTrades.slice(0, 20).map(t => ({
  symbol: t.symbol,
  strategy: t.strategy,
  side: t.side,
  emotion: t.emotion_before,
  pnl: t.pnl,
  followed_rules: t.followed_rules
})))}

Identify 5 key patterns that correlate with profitability. For each pattern, provide:
- Pattern name
- Description
- Win rate when pattern is present
- Actionable advice

Return JSON array.`;

    const schema = {
      type: "object",
      properties: {
        patterns: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              winRate: { type: "number" },
              advice: { type: "string" }
            }
          }
        }
      }
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema
    });

    return result.patterns || [];
  } catch (error) {
    console.error('Pattern analysis error:', error);
    return [];
  }
}

// Analyze emotional impact
export async function analyzeEmotionalImpact(trades) {
  try {
    const emotionData = trades.reduce((acc, trade) => {
      const emotion = trade.emotion_before || 'Unknown';
      if (!acc[emotion]) {
        acc[emotion] = { wins: 0, losses: 0, totalPnl: 0, count: 0 };
      }
      acc[emotion].count++;
      acc[emotion].totalPnl += trade.pnl;
      if (trade.pnl > 0) acc[emotion].wins++;
      else if (trade.pnl < 0) acc[emotion].losses++;
      return acc;
    }, {});

    const prompt = `Analyze how emotions affect trading performance:

${Object.entries(emotionData).map(([emotion, stats]) => 
  `${emotion}: ${stats.count} trades, ${(stats.wins / stats.count * 100).toFixed(1)}% win rate, $${stats.totalPnl.toFixed(2)} P&L`
).join('\n')}

Provide:
1. Best emotions for trading (top 3)
2. Emotions to avoid (worst 3)
3. Specific advice for emotional management

Return detailed analysis with actionable recommendations.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    return {
      emotionData,
      analysis: result
    };
  } catch (error) {
    console.error('Emotional analysis error:', error);
    return null;
  }
}

// Risk prediction
export async function predictRisks(trades, recentTrades) {
  try {
    const recentStats = calculateTradeStats(recentTrades.slice(0, 10));
    const overallStats = calculateTradeStats(trades);
    
    const prompt = `Based on recent trading activity, predict potential risks:

RECENT 10 TRADES:
- Win Rate: ${recentStats.winRate.toFixed(1)}%
- P&L: $${recentStats.totalPnl.toFixed(2)}
- Average Loss: $${recentStats.avgLoss.toFixed(2)}

OVERALL PERFORMANCE:
- Win Rate: ${overallStats.winRate.toFixed(1)}%
- Total P&L: $${overallStats.totalPnl.toFixed(2)}

Identify 3-5 potential risks or warning signs. For each:
- Risk level (Low/Medium/High)
- Description
- Mitigation strategy

Return JSON array.`;

    const schema = {
      type: "object",
      properties: {
        risks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              level: { type: "string" },
              description: { type: "string" },
              mitigation: { type: "string" }
            }
          }
        }
      }
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema
    });

    return result.risks || [];
  } catch (error) {
    console.error('Risk prediction error:', error);
    return [];
  }
}

// Helper functions
function calculateTradeStats(trades) {
  if (!trades.length) return {};
  
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winRate = (winningTrades.length / totalTrades) * 100;
  
  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
    : 0;
  
  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length)
    : 0;
  
  const profitFactor = avgLoss > 0 ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) : 0;
  
  const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0;
  const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0;
  
  const symbolCounts = trades.reduce((acc, t) => {
    acc[t.symbol] = (acc[t.symbol] || 0) + 1;
    return acc;
  }, {});
  const topSymbols = Object.entries(symbolCounts)
    .sort(([,a], [,b]) => b - a)
    .map(([symbol]) => symbol);
  
  const strategyCounts = trades.reduce((acc, t) => {
    if (t.strategy) acc[t.strategy] = (acc[t.strategy] || 0) + 1;
    return acc;
  }, {});
  const topStrategy = Object.entries(strategyCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
  
  const instrumentCounts = trades.reduce((acc, t) => {
    if (t.instrument_type) acc[t.instrument_type] = (acc[t.instrument_type] || 0) + 1;
    return acc;
  }, {});
  const topInstrument = Object.entries(instrumentCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
  
  const longTrades = trades.filter(t => t.side === 'Long').length;
  const shortTrades = trades.filter(t => t.side === 'Short').length;
  const sideBias = longTrades > shortTrades ? 'Long' : 'Short';
  
  const emotionCounts = trades.reduce((acc, t) => {
    if (t.emotion_before) acc[t.emotion_before] = (acc[t.emotion_before] || 0) + 1;
    return acc;
  }, {});
  const topEmotionBefore = Object.entries(emotionCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
  
  const calmWins = trades.filter(t => t.emotion_before === 'Calm' && t.pnl > 0).length;
  const calmTotal = trades.filter(t => t.emotion_before === 'Calm').length;
  const emotionWinCorrelation = calmTotal > 0 ? ((calmWins / calmTotal) * 100).toFixed(1) + '%' : 'N/A';
  
  return {
    totalTrades,
    winRate,
    totalPnl,
    profitFactor,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    topSymbols,
    topStrategy,
    topInstrument,
    sideBias,
    topEmotionBefore,
    emotionWinCorrelation
  };
}

function parseInsights(text) {
  const sections = {
    strengths: [],
    weaknesses: [],
    patterns: [],
    risks: [],
    recommendations: []
  };
  
  const lines = text.split('\n');
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