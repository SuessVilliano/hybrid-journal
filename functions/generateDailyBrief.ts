import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's plan
    const plans = await base44.entities.DailyTradePlan.filter({
      created_by: user.email,
      date: today.toISOString().split('T')[0]
    });
    const todaysPlan = plans[0];

    // Get yesterday's trades
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const yesterdayTrades = await base44.entities.Trade.filter({
      created_by: user.email,
      entry_date: { $gte: yesterday.toISOString(), $lt: today.toISOString() }
    });

    // Get active prop firm settings
    const propSettings = await base44.entities.PropFirmSettings.filter({ 
      created_by: user.email,
      is_active: true 
    });

    // Calculate yesterday's performance
    const yesterdayPnl = yesterdayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const yesterdayWins = yesterdayTrades.filter(t => t.pnl > 0).length;
    const yesterdayWinRate = yesterdayTrades.length > 0 
      ? (yesterdayWins / yesterdayTrades.length) * 100 
      : 0;

    // Generate brief using LLM
    const prompt = `Generate a personalized morning trading brief for ${user.full_name}:

YESTERDAY'S PERFORMANCE:
- Trades: ${yesterdayTrades.length}
- P&L: $${yesterdayPnl.toFixed(2)}
- Win Rate: ${yesterdayWinRate.toFixed(1)}%

TODAY'S PLAN:
${todaysPlan ? `
- Max Trades: ${todaysPlan.max_trades || 'Not set'}
- Max Risk: ${todaysPlan.max_risk ? '$' + todaysPlan.max_risk : 'Not set'}
- Markets: ${todaysPlan.markets_to_watch?.join(', ') || 'Not specified'}
- Rules: ${todaysPlan.trading_rules?.join(', ') || 'Not specified'}
` : 'No plan created yet for today'}

PROP FIRM STATUS:
${propSettings.length > 0 ? `
- Firm: ${propSettings[0].firm_name}
- Daily Loss Limit: ${propSettings[0].max_daily_loss_percent}%
- Phase: ${propSettings[0].phase}
` : 'No active prop firm account'}

Create a brief that:
1. Acknowledges yesterday's performance
2. Highlights key focus areas for today
3. Reminds of risk limits
4. Provides motivational guidance
5. Suggests 1-2 specific actions

Keep it concise (max 200 words), personal, and actionable.`;

    const brief = await base44.integrations.Core.InvokeLLM({ prompt });

    return Response.json({
      success: true,
      brief: brief,
      yesterdayStats: {
        trades: yesterdayTrades.length,
        pnl: yesterdayPnl,
        winRate: yesterdayWinRate
      },
      todaysPlan: todaysPlan,
      propFirmStatus: propSettings[0] || null
    });

  } catch (error) {
    console.error('Brief generation error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});