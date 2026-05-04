import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * dailyHybridCopyReport
 *
 * Generates per-provider daily P&L reports for users with at least one
 * active HybridCopy connection and emails / notifies them.
 *
 * Designed to be called either:
 *   - on a schedule (one user → run with { user_email })
 *   - in fan-out mode (no user_email → iterate all users with HybridCopy)
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

function startOfDayIso(d = new Date()) {
    const s = new Date(d);
    s.setHours(0, 0, 0, 0);
    return s.toISOString();
}

async function generateReportForUser(base44: any, userEmail: string) {
    const dayStart = startOfDayIso();

    const trades = await base44.asServiceRole.entities.Trade.filter({
        user_email: userEmail,
        synced_from_hybridcopy: true
    });

    const today = trades.filter(
        (t: any) => new Date(t.entry_date).toISOString() >= dayStart
    );

    if (today.length === 0) {
        return { user_email: userEmail, sent: false, reason: 'No HybridCopy trades today' };
    }

    const byProvider: Record<string, { count: number; pnl: number; wins: number; losses: number }> = {};
    for (const t of today) {
        const p = t.provider || 'UNKNOWN';
        if (!byProvider[p]) byProvider[p] = { count: 0, pnl: 0, wins: 0, losses: 0 };
        byProvider[p].count++;
        byProvider[p].pnl += t.pnl || 0;
        if ((t.pnl || 0) > 0) byProvider[p].wins++;
        else if ((t.pnl || 0) < 0) byProvider[p].losses++;
    }

    const lines: string[] = [];
    lines.push(`<h2>Your HybridCopy Daily P&amp;L</h2>`);
    lines.push(`<table style="border-collapse:collapse;width:100%;font-family:sans-serif">`);
    lines.push(
        `<thead><tr><th align="left">Provider</th><th>Trades</th><th>Wins</th><th>Losses</th><th align="right">P&amp;L</th></tr></thead>`
    );
    let totalPnl = 0;
    for (const [provider, stats] of Object.entries(byProvider)) {
        totalPnl += stats.pnl;
        lines.push(
            `<tr><td>${PROVIDER_LABEL[provider] || provider}</td><td align="center">${stats.count}</td><td align="center">${stats.wins}</td><td align="center">${stats.losses}</td><td align="right" style="color:${stats.pnl >= 0 ? '#16a34a' : '#dc2626'}">${stats.pnl >= 0 ? '+' : ''}$${stats.pnl.toFixed(2)}</td></tr>`
        );
    }
    lines.push(`</table>`);
    lines.push(
        `<p><strong>Total today: <span style="color:${totalPnl >= 0 ? '#16a34a' : '#dc2626'}">${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}</span></strong></p>`
    );

    try {
        await base44.integrations.Core.SendEmail({
            to: userEmail,
            subject: `HybridJournal · Daily HybridCopy Report (${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)})`,
            body: lines.join('\n'),
            html: true
        });
    } catch (err) {
        console.warn('[dailyHybridCopyReport] email failed:', err.message);
    }

    try {
        await base44.asServiceRole.entities.Notification.create({
            user_email: userEmail,
            title: 'Daily HybridCopy Report',
            body: `Today's HybridCopy P&L: ${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`,
            type: 'report',
            read: false
        });
    } catch (err) {
        console.warn('[dailyHybridCopyReport] notification create failed:', err.message);
    }

    return { user_email: userEmail, sent: true, total_pnl: totalPnl, by_provider: byProvider };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

        if (body.user_email) {
            const result = await generateReportForUser(base44, body.user_email);
            return Response.json(result, {
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Fan-out: every user with an active HybridCopy connection.
        const apps = await base44.asServiceRole.entities.ConnectedApp.filter({
            app_name: 'HybridCopy',
            status: 'active'
        });

        const seen = new Set<string>();
        const results: any[] = [];
        for (const app of apps) {
            if (seen.has(app.user_email)) continue;
            seen.add(app.user_email);
            try {
                results.push(await generateReportForUser(base44, app.user_email));
            } catch (err) {
                results.push({ user_email: app.user_email, sent: false, error: err.message });
            }
        }

        return Response.json(
            { processed: results.length, results },
            { headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
