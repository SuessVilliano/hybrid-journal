import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// AI audit agent backend: extracts trade records from an uploaded document
// (PDF/CSV/XLSX broker statement) and audits them for data-accuracy issues.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const file_url = body.file_url;
    const doc_type = body.doc_type || 'trade_statement';
    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    // Schema the extractor should conform to for trade statements
    const tradeSchema = {
      type: 'object',
      properties: {
        trades: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              symbol: { type: 'string' },
              side: { type: 'string' },
              entry_date: { type: 'string' },
              exit_date: { type: 'string' },
              entry_price: { type: 'number' },
              exit_price: { type: 'number' },
              quantity: { type: 'number' },
              pnl: { type: 'number' },
              source_trade_id: { type: 'string' }
            }
          }
        },
        account_summary: {
          type: 'object',
          properties: {
            starting_balance: { type: 'number' },
            ending_balance: { type: 'number' },
            total_pnl: { type: 'number' },
            total_trades: { type: 'number' }
          }
        }
      }
    };

    const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: tradeSchema
    });

    if (extraction.status === 'error') {
      return Response.json({
        status: 'error',
        summary: 'Could not read the document',
        details: extraction.details || 'Unrecognized file format'
      });
    }

    const data = extraction.output || {};
    const trades = Array.isArray(data.trades) ? data.trades : [];
    const summary = data.account_summary || {};

    const findings = [];
    let cleanCount = 0;
    const seenKeys = new Set();
    let duplicates = 0;

    trades.forEach((t, i) => {
      const issues = [];
      if (!t.symbol) issues.push('missing symbol');
      if (!t.side) issues.push('missing side');
      if (!t.entry_date) issues.push('missing entry date');
      if (t.entry_price == null) issues.push('missing entry price');
      if (t.pnl == null) issues.push('missing pnl');

      const key = t.source_trade_id || `${t.symbol}|${t.side}|${t.entry_date}|${t.entry_price}`;
      if (seenKeys.has(key)) { duplicates++; issues.push('possible duplicate'); }
      else seenKeys.add(key);

      if (issues.length) findings.push({ record: i + 1, symbol: t.symbol || '—', issues });
      else cleanCount++;
    });

    // Totals consistency checks
    const computedPnl = trades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    if (summary.total_pnl != null && Math.abs(computedPnl - summary.total_pnl) > 0.01) {
      findings.push({
        type: 'totals_mismatch',
        message: `Stated total P&L ${summary.total_pnl} vs computed ${computedPnl.toFixed(2)} — difference of ${(summary.total_pnl - computedPnl).toFixed(2)}`
      });
    }
    if (summary.total_trades != null && summary.total_trades !== trades.length) {
      findings.push({
        type: 'count_mismatch',
        message: `Stated trade count ${summary.total_trades} vs extracted ${trades.length}`
      });
    }

    return Response.json({
      status: 'success',
      doc_type,
      extracted_count: trades.length,
      clean_count: cleanCount,
      duplicate_count: duplicates,
      findings,
      account_summary: summary,
      sample: trades.slice(0, 3)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});