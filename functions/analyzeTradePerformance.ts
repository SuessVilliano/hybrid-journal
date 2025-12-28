import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { timeframe = '30d', account_id = null } = await req.json();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch(timeframe) {
      case '7d': startDate.setDate(startDate.getDate() - 7); break;
      case '30d': startDate.setDate(startDate.getDate() - 30); break;
      case '90d': startDate.setDate(startDate.getDate() - 90); break;
      case '1y': startDate.setFullYear(startDate.getFullYear() - 1); break;
      default: startDate.setDate(startDate.getDate() - 30);
    }

    // Fetch trades
    let trades = await base44.entities.Trade.filter({
      created_by: user.email,
      entry_date: { $gte: startDate.toISOString() }
    });

    if (account_id) {
      trades = trades.filter(t => t.account_id === account_id);
    }

    // Calculate metrics
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length 
      : 0;
    const avgLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length)
      : 0;
    
    const profitFactor = avgLoss > 0 ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) : 0;

    // Group by emotion
    const emotionPerformance = {};
    trades.forEach(t => {
      const emotion = t.emotion_before || 'Unknown';
      if (!emotionPerformance[emotion]) {
        emotionPerformance[emotion] = { trades: 0, pnl: 0, wins: 0 };
      }
      emotionPerformance[emotion].trades++;
      emotionPerformance[emotion].pnl += t.pnl || 0;
      if (t.pnl > 0) emotionPerformance[emotion].wins++;
    });

    // Use LLM for insights
    const prompt = `Analyze this trading performance data and provide actionable insights:

Total Trades: ${totalTrades}
Win Rate: ${winRate.toFixed(1)}%
Total P&L: $${totalPnl.toFixed(2)}
Profit Factor: ${profitFactor.toFixed(2)}
Avg Win: $${avgWin.toFixed(2)}
Avg Loss: $${avgLoss.toFixed(2)}

Emotion Performance:
${Object.entries(emotionPerformance).map(([emotion, data]) => 
  `${emotion}: ${data.trades} trades, ${((data.wins/data.trades)*100).toFixed(1)}% win rate, $${data.pnl.toFixed(2)} P&L`
).join('\n')}

Provide:
1. Top 3 strengths
2. Top 3 areas for improvement
3. Specific actionable recommendations
4. Psychological patterns to watch

Be concise and specific.`;

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          strengths: { type: "array", items: { type: "string" } },
          improvements: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          psychological_patterns: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({
      success: true,
      metrics: {
        totalTrades,
        winRate,
        totalPnl,
        profitFactor,
        avgWin,
        avgLoss,
        emotionPerformance
      },
      insights: llmResponse
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});