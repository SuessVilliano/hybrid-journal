import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CRYPTO_SYMBOLS = ['BTCUSD','ETHUSD','SOLUSD','XRPUSD'];
const FOREX_SYMBOLS = ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','NZDUSD','USDCHF','GBPJPY','EURJPY','XAUUSD'];
const FUTURES_KEYWORDS = ['NQ1','MNQ1','ES1','MES1','YM1','MYM1','NAS100USD','US30USD','US500USD'];

function getProviderBySymbol(sym) {
  const s = (sym || '').toUpperCase();
  if (CRYPTO_SYMBOLS.includes(s)) return 'Paradox';
  if (FOREX_SYMBOLS.includes(s)) return 'Solaris';
  if (FUTURES_KEYWORDS.some(f => s.includes(f)) || /NQ|MNQ|^ES|^YM/.test(s)) return 'Hybrid Ai';
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Fetch all signals in batches
    const allSignals = await base44.asServiceRole.entities.Signal.list('-created_date', 1000);

    let updated = 0;
    let skipped = 0;

    for (const signal of allSignals) {
      const correctProvider = getProviderBySymbol(signal.symbol);
      if (!correctProvider) { skipped++; continue; }
      if (signal.provider === correctProvider) { skipped++; continue; }

      await base44.asServiceRole.entities.Signal.update(signal.id, { provider: correctProvider });
      updated++;
    }

    return Response.json({
      success: true,
      total: allSignals.length,
      updated,
      skipped
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});