import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI Data Access: Get Performance Summary
 * Provides comprehensive trading performance statistics
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { dateRange = null } = payload;

    let queryFilters = {};
    if (dateRange?.start || dateRange?.end) {
      queryFilters.entry_date = {};
      if (dateRange.start) queryFilters.entry_date.$gte = new Date(dateRange.start).toISOString();
      if (dateRange.end) queryFilters.entry_date.$lte = new Date(dateRange.end).toISOString();
    }

    const trades = await base44.entities.Trade.filter(queryFilters, '-entry_date', 1000);

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length 
      : 0;
    const avgLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length)
      : 0;
    
    const profitFactor = avgLoss > 0 
      ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) 
      : 0;

    // Best and worst trades
    const sortedByPnl = [...trades].sort((a, b) => b.pnl - a.pnl);
    const bestTrade = sortedByPnl[0] || null;
    const worstTrade = sortedByPnl[sortedByPnl.length - 1] || null;

    // Performance by instrument
    const byInstrument = {};
    trades.forEach(t => {
      if (!byInstrument[t.symbol]) {
        byInstrument[t.symbol] = { trades: 0, pnl: 0, wins: 0 };
      }
      byInstrument[t.symbol].trades++;
      byInstrument[t.symbol].pnl += t.pnl || 0;
      if (t.pnl > 0) byInstrument[t.symbol].wins++;
    });

    return Response.json({
      summary: {
        total_trades: trades.length,
        winning_trades: winningTrades.length,
        losing_trades: losingTrades.length,
        total_pnl: totalPnl,
        win_rate: winRate,
        avg_win: avgWin,
        avg_loss: avgLoss,
        profit_factor: profitFactor,
        best_trade: bestTrade ? { symbol: bestTrade.symbol, pnl: bestTrade.pnl, date: bestTrade.entry_date } : null,
        worst_trade: worstTrade ? { symbol: worstTrade.symbol, pnl: worstTrade.pnl, date: worstTrade.entry_date } : null
      },
      by_instrument: byInstrument,
      date_range: dateRange,
      trades_analyzed: trades.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});