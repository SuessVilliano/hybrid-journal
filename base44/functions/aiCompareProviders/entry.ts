import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * aiCompareProviders
 *
 * Powers the cross-platform comparison section of the AI Insights panel.
 * Bucket synced trades by provider + symbol_class, compute MTD return,
 * and feed those summaries to the LLM so it can produce text like:
 *
 *   "Your Tradovate futures accounts are up 3.2% MTD; your GooeyPro
 *    equities account is down 1.1%."
 */

const PROVIDER_LABEL: Record<string, string> = {
    TRADOVATE: 'Tradovate',
    DXTRADE: 'DXtrade',
    VOLUMETRICA: 'Volumetrica',
    GOOEYPRO: 'GooeyPro',
    HYBRID_FUNDING: 'Hybrid Funding',
    HYBRID_FUNDING_EQUITIES: 'Hybrid Funding Equities',
    HYBRID_COPY: 'HybridCopy'
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const trades = await base44.entities.Trade.filter({
            user_email: user.email,
            synced_from_hybridcopy: true
        });

        const mtdTrades = trades.filter(
            (t: any) => new Date(t.entry_date) >= monthStart
        );

        const buckets: Record<string, { provider: string; symbol_class: string; pnl: number; count: number; latest_balance: number | null }> = {};

        for (const t of mtdTrades) {
            const provider = t.provider || 'UNKNOWN';
            const symbolClass = t.symbol_class || (t.instrument_type === 'Stocks' ? 'equities' : 'futures');
            const key = `${provider}::${symbolClass}`;
            if (!buckets[key]) {
                buckets[key] = { provider, symbol_class: symbolClass, pnl: 0, count: 0, latest_balance: null };
            }
            buckets[key].pnl += t.pnl || 0;
            buckets[key].count++;
        }

        // Latest snapshot per provider for percentage math.
        for (const key of Object.keys(buckets)) {
            const b = buckets[key];
            try {
                const snaps = await base44.entities.AccountSnapshot.filter({
                    user_email: user.email,
                    provider: b.provider
                });
                if (snaps.length > 0) {
                    const latest = snaps.sort(
                        (a: any, b: any) =>
                            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    )[0];
                    b.latest_balance = latest.balance || latest.equity || null;
                }
            } catch {
                // entity may not exist yet; ignore
            }
        }

        const summaries = Object.values(buckets).map((b) => {
            const pct =
                b.latest_balance && b.latest_balance !== 0
                    ? (b.pnl / b.latest_balance) * 100
                    : null;
            return {
                provider: PROVIDER_LABEL[b.provider] || b.provider,
                symbol_class: b.symbol_class,
                trades: b.count,
                mtd_pnl: b.pnl,
                mtd_pct: pct
            };
        });

        let narrative = '';
        if (summaries.length > 0) {
            try {
                const prompt = `You are a trading performance analyst. Produce a 2-3 sentence comparison of the user's HybridCopy provider performance month-to-date. Use the format "Your <provider> <symbol_class> accounts are up/down X.X% MTD". Be concise.\n\nData:\n${JSON.stringify(summaries, null, 2)}`;
                narrative = await base44.integrations.Core.InvokeLLM({ prompt });
            } catch (err) {
                narrative = summaries
                    .map((s) => {
                        const dir = (s.mtd_pnl || 0) >= 0 ? 'up' : 'down';
                        const pct = s.mtd_pct != null ? `${Math.abs(s.mtd_pct).toFixed(1)}%` : `$${Math.abs(s.mtd_pnl).toFixed(2)}`;
                        return `Your ${s.provider} ${s.symbol_class} accounts are ${dir} ${pct} MTD.`;
                    })
                    .join(' ');
            }
        }

        return Response.json(
            { summaries, narrative },
            { headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
