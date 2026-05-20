import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { decryptSecret } from './helpers/secrets.js';

/**
 * syncCrossTrade — Pull NinjaTrader 8 futures executions from a trader's
 * CrossTrade account and journal them as round-trip Trade records.
 *
 * CrossTrade (https://crosstrade.io) bridges a desktop NinjaTrader 8 instance
 * — connected to Tradovate / Rithmic for brokerage — to a cloud REST API.
 *
 *   Auth:  Authorization: Bearer <token>   (token from app.crosstrade.io → My Account)
 *   Base:  https://app.crosstrade.io/v1/api
 *
 * Note: every call is forwarded to the live NT8 add-on. HTTP 408 means the
 * token is valid but NinjaTrader 8 / the add-on is not currently running.
 *
 * CrossTrade's `executions` endpoint returns individual fills, not round-trip
 * trades, so this function FIFO-pairs fills per instrument to build the
 * entry/exit Trade records the journal expects (same shape as syncDXTrade).
 */

const DEFAULT_BASE = 'https://app.crosstrade.io/v1/api';

interface NormFill {
    id: string;
    instrument: string;
    side: 'Long' | 'Short';   // direction of THIS fill (Buy -> Long, Sell -> Short)
    qty: number;
    price: number;
    time: number;             // epoch ms
    commission: number;
    pnl: number | null;       // realized $ P&L reported by NT on closing fills
}

interface RoundTrip {
    brokerTradeId: string;
    instrument: string;
    side: 'Long' | 'Short';
    qty: number;
    entryPrice: number;
    exitPrice: number | null;
    entryTime: string;
    exitTime: string | null;
    pnl: number;
    commission: number;
    status: 'open' | 'closed';
}

// Pull the first array we can find — CrossTrade wraps payloads as { success, data }
// and `data` may be an array or an object keyed by `accounts` / `executions`.
function asArray(data: any, ...keys: string[]): any[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        for (const k of keys) if (Array.isArray(data[k])) return data[k];
    }
    return [];
}

function toMs(t: any): number {
    if (t == null) return Date.now();
    if (typeof t === 'number') return t > 1e12 ? t : t * 1000;
    const p = Date.parse(String(t));
    return isNaN(p) ? Date.now() : p;
}

async function ctFetch(base: string, token: string, path: string): Promise<any> {
    const res = await fetch(`${base}${path}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    const text = await res.text();
    let body: any = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }

    if (!res.ok) {
        const msg = body?.error || body?.message || `HTTP ${res.status}`;
        if (res.status === 408) throw new Error('NinjaTrader 8 / the CrossTrade add-on is not connected. Start NinjaTrader and retry.');
        if (res.status === 401) throw new Error('CrossTrade token is invalid or expired.');
        if (res.status === 429) throw new Error('CrossTrade rate limit hit (180 req/min). Retry shortly.');
        throw new Error(`CrossTrade ${path} failed (${res.status}): ${msg}`);
    }
    return body?.data !== undefined ? body.data : body;
}

// Normalize a raw CrossTrade/NinjaTrader execution object into a NormFill.
function normalizeFill(ex: any): NormFill | null {
    const id = String(ex.executionId ?? ex.execId ?? ex.id ?? ex.name ?? '');
    const instrument = String(ex.instrument ?? ex.instrumentName ?? ex.symbol ?? '');
    const rawAction = String(ex.orderAction ?? ex.action ?? ex.marketPosition ?? ex.side ?? '');
    const qty = Number(ex.quantity ?? ex.qty ?? ex.size ?? 0);
    const price = Number(ex.price ?? ex.fillPrice ?? ex.avgPrice ?? 0);
    const time = ex.time ?? ex.timestamp ?? ex.executionTime ?? ex.fillTime ?? ex.date;

    if (!id || !instrument || !qty || !time) return null;

    // Buy / BuyToCover / Long => long-direction fill; Sell / SellShort / Short => short.
    const isLong = /buy|long/i.test(rawAction) && !/sell|short/i.test(rawAction);
    return {
        id,
        instrument,
        side: isLong ? 'Long' : 'Short',
        qty,
        price,
        time: toMs(time),
        commission: Number(ex.commission ?? ex.fees ?? 0),
        pnl: ex.pnl ?? ex.realizedPnl ?? ex.profitLoss ?? null
    };
}

// FIFO-pair fills per instrument into round-trip trades. A closing fill is
// matched against the oldest open lot(s) of the opposite direction.
function reconstructTrades(fills: NormFill[], account: string): RoundTrip[] {
    const trips: RoundTrip[] = [];
    const byInstrument = new Map<string, NormFill[]>();
    for (const f of fills) {
        if (!byInstrument.has(f.instrument)) byInstrument.set(f.instrument, []);
        byInstrument.get(f.instrument)!.push(f);
    }

    for (const [instrument, list] of byInstrument) {
        list.sort((a, b) => a.time - b.time);
        const lots: { qty: number; origQty: number; price: number; time: number; side: 'Long' | 'Short'; id: string; commission: number }[] = [];

        for (const f of list) {
            let remaining = f.qty;

            // Close opposite-direction lots first (FIFO).
            while (remaining > 0 && lots.length > 0 && lots[0].side !== f.side) {
                const lot = lots[0];
                const matched = Math.min(remaining, lot.qty);
                const sign = lot.side === 'Long' ? 1 : -1;

                // Prefer NinjaTrader's reported $ P&L, allocated by matched qty;
                // fall back to a raw point difference when P&L isn't supplied.
                const pnl = (f.pnl != null && f.qty > 0)
                    ? (f.pnl as number) * (matched / f.qty)
                    : sign * (f.price - lot.price) * matched;

                const commission =
                    lot.commission * (matched / lot.origQty) +
                    f.commission * (matched / f.qty);

                trips.push({
                    brokerTradeId: `${account}:${lot.id}#${f.id}`,
                    instrument,
                    side: lot.side,
                    qty: matched,
                    entryPrice: lot.price,
                    exitPrice: f.price,
                    entryTime: new Date(lot.time).toISOString(),
                    exitTime: new Date(f.time).toISOString(),
                    pnl,
                    commission,
                    status: 'closed'
                });

                lot.qty -= matched;
                remaining -= matched;
                if (lot.qty <= 0.0000001) lots.shift();
            }

            // Whatever is left opens (or adds to) a position.
            if (remaining > 0) {
                lots.push({
                    qty: remaining,
                    origQty: remaining,
                    price: f.price,
                    time: f.time,
                    side: f.side,
                    id: f.id,
                    commission: f.commission * (remaining / f.qty)
                });
            }
        }

        // Any lots still open at the end of the window are open trades.
        for (const lot of lots) {
            trips.push({
                brokerTradeId: `${account}:${lot.id}#open`,
                instrument,
                side: lot.side,
                qty: lot.qty,
                entryPrice: lot.price,
                exitPrice: null,
                entryTime: new Date(lot.time).toISOString(),
                exitTime: null,
                pnl: 0,
                commission: lot.commission,
                status: 'open'
            });
        }
    }

    return trips;
}

Deno.serve(async (req) => {
    const startTime = Date.now();

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

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { connection_id, account: accountParam, lookbackTime } = await req.json();

        if (!connection_id) {
            return Response.json({ error: 'Missing connection_id' }, { status: 400 });
        }

        // Load and authorize the broker connection.
        const connections = await base44.entities.BrokerConnection.filter({ id: connection_id });
        if (connections.length === 0) {
            return Response.json({ error: 'Connection not found' }, { status: 404 });
        }
        const connection = connections[0];

        if (connection.created_by !== user.email) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }
        // Accept either field: brokerAPIHelper uses `broker_id` (lowercase),
        // the setup wizard uses `provider` (PascalCase) — normalize both.
        const brokerKind = String(connection.broker_id || connection.provider || '').toLowerCase();
        if (brokerKind !== 'crosstrade') {
            return Response.json({ error: 'Not a CrossTrade connection' }, { status: 400 });
        }

        // Decrypt the at-rest secret (legacy plaintext values pass through unchanged).
        const token = await decryptSecret(connection.api_key || connection.api_secret || '');
        if (!token) {
            return Response.json({ error: 'CrossTrade connection has no API token' }, { status: 400 });
        }
        const base = (connection.server && connection.server.startsWith('http'))
            ? connection.server.replace(/\/$/, '')
            : DEFAULT_BASE;

        console.log(`[SyncCrossTrade] Starting sync for connection ${connection_id}`);

        // Resolve which NinjaTrader account(s) to sync.
        let accounts: string[];
        if (accountParam) {
            accounts = [String(accountParam)];
        } else if (connection.account_number) {
            accounts = [String(connection.account_number)];
        } else {
            const accountList = asArray(await ctFetch(base, token, '/accounts'), 'accounts');
            accounts = accountList
                .map((a: any) => (typeof a === 'string' ? a : (a?.name ?? a?.account ?? a?.accountName)))
                .filter(Boolean);
        }

        if (accounts.length === 0) {
            return Response.json({ error: 'No NinjaTrader accounts found for this CrossTrade token' }, { status: 404 });
        }

        // Pull executions for each account and reconstruct round-trip trades.
        const lookbackQuery = lookbackTime ? `?lookbackTime=${encodeURIComponent(lookbackTime)}` : '';
        const allTrips: RoundTrip[] = [];
        let rawFillCount = 0;
        let accountBalance: number | undefined;
        let accountEquity: number | undefined;

        for (const account of accounts) {
            const execData = await ctFetch(
                base, token,
                `/accounts/${encodeURIComponent(account)}/executions${lookbackQuery}`
            );
            const rawFills = asArray(execData, 'executions', 'data');
            rawFillCount += rawFills.length;

            const fills = rawFills
                .map(normalizeFill)
                .filter((f): f is NormFill => f !== null);

            allTrips.push(...reconstructTrades(fills, account));

            // Best-effort account balance for the connection record (non-fatal).
            try {
                const acct = await ctFetch(base, token, `/accounts/${encodeURIComponent(account)}`);
                const a = Array.isArray(acct) ? acct[0] : acct;
                accountBalance = Number(a?.cashValue ?? a?.balance ?? accountBalance ?? 0) || accountBalance;
                accountEquity = Number(a?.equity ?? a?.netLiquidation ?? accountBalance ?? 0) || accountEquity;
            } catch (e) {
                console.warn(`[SyncCrossTrade] Could not fetch account info for ${account}: ${e.message}`);
            }
        }

        // Upsert trades, de-duplicating on broker_trade_id.
        const existingTrades = await base44.entities.Trade.filter({ broker_connection_id: connection_id });
        const existingByBrokerId = new Map(
            existingTrades.filter(t => t.broker_trade_id).map(t => [t.broker_trade_id, t])
        );

        let imported = 0;
        let updated = 0;
        let skipped = 0;
        const errors: any[] = [];

        for (const trip of allTrips) {
            try {
                const pnlNet = trip.pnl - trip.commission;
                const existing = existingByBrokerId.get(trip.brokerTradeId);

                if (existing) {
                    // Update when the trade has closed or its P&L changed.
                    if ((!existing.exit_date && trip.exitTime) || Math.abs((existing.pnl || 0) - trip.pnl) > 0.01) {
                        await base44.entities.Trade.update(existing.id, {
                            exit_date: trip.exitTime || existing.exit_date,
                            exit_price: trip.exitPrice ?? existing.exit_price,
                            pnl: trip.pnl,
                            pnl_net: pnlNet,
                            commission: trip.commission,
                            trade_status: trip.status
                        });
                        updated++;
                    } else {
                        skipped++;
                    }
                    continue;
                }

                await base44.entities.Trade.create({
                    symbol: trip.instrument,
                    side: trip.side,
                    quantity: trip.qty,
                    entry_price: trip.entryPrice,
                    exit_price: trip.exitPrice,
                    entry_date: trip.entryTime,
                    exit_date: trip.exitTime,
                    pnl: trip.pnl,
                    pnl_net: pnlNet,
                    commission: trip.commission,
                    swap: 0,
                    platform: 'CrossTrade',
                    instrument_type: 'Futures',
                    broker_connection_id: connection_id,
                    broker_trade_id: trip.brokerTradeId,
                    import_source: 'CrossTrade API Sync',
                    trade_status: trip.status
                });
                imported++;
            } catch (tradeError) {
                errors.push({ trade: trip.brokerTradeId, error: tradeError.message });
            }
        }

        // Update the connection with latest sync state.
        const updateData: any = {
            last_sync: new Date().toISOString(),
            status: 'connected'
        };
        if (accountBalance !== undefined) updateData.account_balance = accountBalance;
        if (accountEquity !== undefined) updateData.account_equity = accountEquity;
        await base44.entities.BrokerConnection.update(connection_id, updateData);

        // Write a sync log entry.
        await base44.entities.SyncLog.create({
            broker_connection_id: connection_id,
            sync_type: 'automatic',
            status: errors.length > 0 ? 'partial' : 'success',
            trades_fetched: rawFillCount,
            trades_imported: imported,
            trades_updated: updated,
            trades_skipped: skipped,
            errors: errors.length > 0 ? errors : undefined,
            duration_ms: Date.now() - startTime,
            sync_timestamp: new Date().toISOString()
        });

        console.log(`[SyncCrossTrade] Sync complete: ${imported} imported, ${updated} updated, ${skipped} skipped`);

        return Response.json({
            success: true,
            accounts,
            fills_fetched: rawFillCount,
            trades_built: allTrips.length,
            imported,
            updated,
            skipped,
            errors: errors.length > 0 ? errors : undefined,
            account_balance: accountBalance,
            account_equity: accountEquity,
            duration_ms: Date.now() - startTime
        });

    } catch (error) {
        console.error('[SyncCrossTrade] Error:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});
