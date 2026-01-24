import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI Data Access: Get Journal Entries
 * Allows AI assistant to query user's journal data
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
      limit = 50, 
      sort = '-date',
      dateRange = null
    } = payload;

    let queryFilters = { ...filters };
    if (dateRange?.start || dateRange?.end) {
      queryFilters.date = {};
      if (dateRange.start) queryFilters.date.$gte = new Date(dateRange.start).toISOString();
      if (dateRange.end) queryFilters.date.$lte = new Date(dateRange.end).toISOString();
    }

    const entries = await base44.entities.JournalEntry.filter(queryFilters, sort, limit);

    return Response.json({ 
      entries, 
      count: entries.length,
      filters_applied: queryFilters
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});