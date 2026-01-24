import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI Data Access: Get Trades
 * Allows AI assistant to query user's trading data
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { 
      filters = {}, 
      limit = 100, 
      sort = '-entry_date',
      dateRange = null // { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
    } = payload;

    // Apply date range filter if provided
    let queryFilters = { ...filters };
    if (dateRange?.start || dateRange?.end) {
      queryFilters.entry_date = {};
      if (dateRange.start) queryFilters.entry_date.$gte = new Date(dateRange.start).toISOString();
      if (dateRange.end) queryFilters.entry_date.$lte = new Date(dateRange.end).toISOString();
    }

    const trades = await base44.entities.Trade.filter(queryFilters, sort, limit);

    // Calculate summary stats
    const stats = {
      total_trades: trades.length,
      winning_trades: trades.filter(t => t.pnl > 0).length,
      losing_trades: trades.filter(t => t.pnl < 0).length,
      total_pnl: trades.reduce((sum, t) => sum + (t.pnl || 0), 0),
      avg_pnl: trades.length > 0 ? trades.reduce((sum, t) => sum + (t.pnl || 0), 0) / trades.length : 0
    };

    return Response.json({ 
      trades, 
      stats,
      count: trades.length,
      filters_applied: queryFilters
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});