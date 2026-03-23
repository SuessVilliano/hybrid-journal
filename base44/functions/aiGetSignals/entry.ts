import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI Data Access: Get Trading Signals
 * Allows AI assistant to query user's received signals
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
      sort = '-created_date',
      dateRange = null
    } = payload;

    let queryFilters = { ...filters };
    if (dateRange?.start || dateRange?.end) {
      queryFilters.created_date = {};
      if (dateRange.start) queryFilters.created_date.$gte = new Date(dateRange.start).toISOString();
      if (dateRange.end) queryFilters.created_date.$lte = new Date(dateRange.end).toISOString();
    }

    const signals = await base44.entities.Signal.filter(queryFilters, sort, limit);

    const stats = {
      total: signals.length,
      by_status: {
        new: signals.filter(s => s.status === 'new').length,
        viewed: signals.filter(s => s.status === 'viewed').length,
        executed: signals.filter(s => s.status === 'executed').length,
        ignored: signals.filter(s => s.status === 'ignored').length
      },
      by_action: {
        buy: signals.filter(s => s.action === 'BUY').length,
        sell: signals.filter(s => s.action === 'SELL').length,
        close: signals.filter(s => s.action === 'CLOSE').length
      }
    };

    return Response.json({ 
      signals, 
      stats,
      count: signals.length,
      filters_applied: queryFilters
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});