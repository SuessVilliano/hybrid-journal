import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CRYPTO_SYMBOLS = ['BTCUSD','ETHUSD','SOLUSD','XRPUSD'];
const HYBRID_SYMBOLS = ['NQ1','MNQ1','ES1','MES1','YM1','MYM1'];

function getProviderBySymbol(sym) {
  const s = (sym || '').toUpperCase();
  if (CRYPTO_SYMBOLS.includes(s)) return 'Paradox';
  if (HYBRID_SYMBOLS.some(f => s === f || s.startsWith(f))) return 'Hybrid Ai';
  // Everything else: US30USD, NAS100USD, US500USD, forex → Solaris
  return 'Solaris';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Fetch signals that need fixing (US30USD and NAS100USD with wrong provider)
    const allSignals = await base44.asServiceRole.entities.Signal.list('-created_date', 1000);

    // Only process signals where provider is wrong — avoids unnecessary writes
    const toFix = allSignals.filter(s => {
      const correct = getProviderBySymbol(s.symbol);
      return s.provider !== correct;
    });

    let updated = 0;
    const skipped = allSignals.length - toFix.length;

    // Process in small batches of 5 with a 300ms pause to avoid rate limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < toFix.length; i += BATCH_SIZE) {
      const batch = toFix.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(signal =>
        base44.asServiceRole.entities.Signal.update(signal.id, { provider: getProviderBySymbol(signal.symbol) })
      ));
      updated += batch.length;
      if (i + BATCH_SIZE < toFix.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    return Response.json({
      success: true,
      total: allSignals.length,
      needed_fix: toFix.length,
      updated,
      skipped
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});