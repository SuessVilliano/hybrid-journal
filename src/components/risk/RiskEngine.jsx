import { base44 } from '@/api/base44Client';

// Calculate dynamic stop-loss and take-profit using AI
export async function calculateDynamicRiskLevels(trade, marketData) {
  try {
    const prompt = `As a risk management expert, calculate optimal stop-loss and take-profit levels:

Trade Details:
- Symbol: ${trade.symbol}
- Side: ${trade.side}
- Entry Price: ${trade.entry_price}
- Current Market Volatility: ${marketData?.volatility || 'moderate'}
- Recent Price Range: ${marketData?.priceRange || 'analyzing'}

Market Context:
${marketData?.context || 'Standard market conditions'}

Calculate:
1. Optimal Stop Loss (% from entry)
2. Optimal Take Profit (% from entry)
3. Risk/Reward Ratio
4. Position Size Recommendation (% of portfolio)
5. Confidence Score (0-100)

Consider ATR, recent volatility, and market structure. Return JSON.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          stop_loss_percent: { type: "number" },
          take_profit_percent: { type: "number" },
          risk_reward_ratio: { type: "number" },
          position_size_percent: { type: "number" },
          confidence: { type: "number" },
          reasoning: { type: "string" }
        }
      }
    });

    return {
      stopLoss: trade.entry_price * (1 - result.stop_loss_percent / 100 * (trade.side === 'Long' ? 1 : -1)),
      takeProfit: trade.entry_price * (1 + result.take_profit_percent / 100 * (trade.side === 'Long' ? 1 : -1)),
      stopLossPercent: result.stop_loss_percent,
      takeProfitPercent: result.take_profit_percent,
      riskReward: result.risk_reward_ratio,
      positionSize: result.position_size_percent,
      confidence: result.confidence,
      reasoning: result.reasoning
    };
  } catch (error) {
    console.error('Dynamic risk calculation error:', error);
    return null;
  }
}

// Portfolio-level risk analysis
export async function analyzePortfolioRisk(trades, accountBalance) {
  try {
    const openTrades = trades.filter(t => !t.exit_date);
    const recentTrades = trades.slice(0, 50);
    
    const totalExposure = openTrades.reduce((sum, t) => 
      sum + (t.quantity * t.entry_price || 0), 0
    );
    
    const avgLoss = recentTrades.filter(t => t.pnl < 0)
      .reduce((sum, t) => sum + Math.abs(t.pnl), 0) / 
      recentTrades.filter(t => t.pnl < 0).length || 0;

    const prompt = `Analyze portfolio risk for a trading account:

Account Balance: $${accountBalance}
Open Positions: ${openTrades.length}
Total Exposure: $${totalExposure.toFixed(2)}
Exposure Ratio: ${((totalExposure / accountBalance) * 100).toFixed(1)}%
Average Loss per Losing Trade: $${avgLoss.toFixed(2)}

Recent Performance:
- Total Trades (last 50): ${recentTrades.length}
- Win Rate: ${((recentTrades.filter(t => t.pnl > 0).length / recentTrades.length) * 100).toFixed(1)}%

Open Positions:
${openTrades.map(t => `- ${t.symbol}: ${t.side}, Qty: ${t.quantity}`).join('\n')}

Provide:
1. Overall Risk Level (Low/Medium/High/Critical)
2. Diversification Score (0-100)
3. Recommended Actions (array of strings)
4. Max Position Size for next trade (% of portfolio)
5. Daily Risk Limit ($)

Return JSON.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          risk_level: { type: "string" },
          diversification_score: { type: "number" },
          recommended_actions: { type: "array", items: { type: "string" } },
          max_position_size_percent: { type: "number" },
          daily_risk_limit: { type: "number" }
        }
      }
    });

    return {
      riskLevel: result.risk_level,
      diversificationScore: result.diversification_score,
      recommendedActions: result.recommended_actions,
      maxPositionSize: result.max_position_size_percent,
      dailyRiskLimit: result.daily_risk_limit,
      totalExposure,
      exposureRatio: (totalExposure / accountBalance) * 100,
      openPositions: openTrades.length
    };
  } catch (error) {
    console.error('Portfolio risk analysis error:', error);
    return null;
  }
}

// Calculate optimal position size
export function calculatePositionSize(accountBalance, riskPercent, entryPrice, stopLoss) {
  const riskAmount = accountBalance * (riskPercent / 100);
  const priceRisk = Math.abs(entryPrice - stopLoss);
  const positionSize = riskAmount / priceRisk;
  
  return {
    shares: Math.floor(positionSize),
    value: positionSize * entryPrice,
    riskAmount,
    riskPercent
  };
}

// Get market volatility data (simplified)
export async function getMarketVolatility(symbol) {
  try {
    const prompt = `Provide current market volatility assessment for ${symbol}:
    
Return:
- volatility: "low" | "moderate" | "high" | "extreme"
- atr_estimate: number (estimated ATR as percentage)
- context: brief market condition description

Return JSON only.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          volatility: { type: "string" },
          atr_estimate: { type: "number" },
          context: { type: "string" }
        }
      }
    });

    return result;
  } catch (error) {
    return { volatility: 'moderate', atr_estimate: 1.5, context: 'Standard conditions' };
  }
}