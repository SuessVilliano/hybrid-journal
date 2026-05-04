import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * receiveFromHybridCopy
 *
 * Single ingest endpoint for the HybridCopy → HybridJournal journal-sync
 * pipeline. Accepts a batch of trades + account snapshots for the new
 * platform integrations (Tradovate, DXtrade futures, Volumetrica/dxFeed,
 * GooeyPro single-session equities, Hybrid Funding equities).
 *
 * Request body:
 *   {
 *     user_id: string,
 *     provider: 'TRADOVATE' | 'DXTRADE' | 'VOLUMETRICA' | 'GOOEYPRO' | 'HYBRID_FUNDING' | 'HYBRID_FUNDING_EQUITIES',
 *     account_external_id: string,
 *     trades: Array<{ source_trade_id, symbol, side, qty, entry_time, entry_price, exit_time, exit_price, pnl_net, fees_json, status, source_type }>,
 *     snapshots: Array<{ timestamp, balance, equity, margin_used, free_margin, unrealized_pnl, buying_power?, session_type? }>
 *   }
 *
 * Auth:
 *   X-HybridCopy-Signature: hex(hmac_sha256(secret, `${X-Timestamp}.${rawBody}`))
 *   X-Timestamp:            unix seconds (replay window: 300s)
 *   X-HybridCopy-Event-Id:  optional idempotency key for the whole batch
 *
 * Behavior:
 *   - Trades upserted by (provider, source_trade_id).
 *   - Snapshots upserted by (provider, connection_id, timestamp).
 *   - Each row is tagged with account_external_id so it routes to the
 *     correct journal account.
 *   - All trades + snapshots from one request are processed in a single
 *     pass and reported back as a single result.
 */

const SUPPORTED_PROVIDERS = new Set([
    'TRADOVATE',
    'DXTRADE',
    'VOLUMETRICA',
    'GOOEYPRO',
    'HYBRID_FUNDING',
    'HYBRID_FUNDING_EQUITIES',
    'HYBRID_COPY'
]);

// Maps provider → default symbol_class so analytics can keep
// futures point-value math separate from equities share math.
const PROVIDER_DEFAULT_CLASS: Record<string, string> = {
    TRADOVATE: 'futures',
    DXTRADE: 'futures',
    VOLUMETRICA: 'futures',
    GOOEYPRO: 'equities',
    HYBRID_FUNDING_EQUITIES: 'equities',
    HYBRID_FUNDING: 'forex',
    HYBRID_COPY: 'futures'
};

const PROVIDER_PLATFORM_LABEL: Record<string, string> = {
    TRADOVATE: 'Tradovate',
    DXTRADE: 'DXtrade',
    VOLUMETRICA: 'Volumetrica',
    GOOEYPRO: 'GooeyPro',
    HYBRID_FUNDING: 'Hybrid Funding',
    HYBRID_FUNDING_EQUITIES: 'Hybrid Funding Equities',
    HYBRID_COPY: 'HybridCopy'
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

function normalizeSide(side: string | undefined): string {
    if (!side) return 'Long';
    const s = side.toString().toLowerCase();
    if (s === 'buy' || s === 'long' || s === 'b') return 'Long';
    if (s === 'sell' || s === 'short' || s === 's') return 'Short';
    return side;
}

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers':
            'Content-Type, Authorization, X-HybridCopy-Signature, X-Timestamp, X-HybridCopy-Event-Id'
    };
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (req.method !== 'POST') {
        return Response.json(
            { error: 'Method not allowed' },
            { status: 405, headers: corsHeaders() }
        );
    }

    try {
        const base44 = createClientFromRequest(req);

        const rawBody = await req.text();
        const body = JSON.parse(rawBody);

        const signature = req.headers.get('X-HybridCopy-Signature');
        const timestamp = req.headers.get('X-Timestamp');
        const eventId =
            req.headers.get('X-HybridCopy-Event-Id') ||
            `${body.user_id || 'anon'}-${body.provider || 'unknown'}-${Date.now()}`;

        if (!signature || !timestamp) {
            return Response.json(
                { error: 'Missing X-HybridCopy-Signature or X-Timestamp' },
                { status: 400, headers: corsHeaders() }
            );
        }

        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
            return Response.json(
                { error: 'Request timestamp outside replay window' },
                { status: 401, headers: corsHeaders() }
            );
        }

        const {
            user_id,
            provider,
            account_external_id,
            trades = [],
            snapshots = [],
            connection_id = null
        } = body;

        if (!user_id || !provider) {
            return Response.json(
                { error: 'user_id and provider are required' },
                { status: 400, headers: corsHeaders() }
            );
        }

        const providerKey = provider.toString().toUpperCase();
        if (!SUPPORTED_PROVIDERS.has(providerKey)) {
            return Response.json(
                {
                    error: `Unsupported provider: ${provider}`,
                    supported: Array.from(SUPPORTED_PROVIDERS)
                },
                { status: 400, headers: corsHeaders() }
            );
        }

        // Resolve the ConnectedApp row that holds the shared HMAC secret.
        // We share the same secret with HybridCopy as the existing
        // ingestEvents endpoint, scoped per (user_id, app_name='HybridCopy').
        const connectedApps = await base44.asServiceRole.entities.ConnectedApp.filter({
            user_id,
            app_name: 'HybridCopy',
            status: 'active'
        });

        if (!connectedApps || connectedApps.length === 0) {
            return Response.json(
                { error: 'No active HybridCopy connection for this user' },
                { status: 404, headers: corsHeaders() }
            );
        }

        const connectedApp = connectedApps[0];
        const sharedSecret = connectedApp.signing_secret_ref;

        const expected = await hmacSha256Hex(sharedSecret, `${timestamp}.${rawBody}`);
        if (!timingSafeEqualHex(expected.toLowerCase(), signature.toLowerCase())) {
            return Response.json(
                { error: 'Invalid signature' },
                { status: 401, headers: corsHeaders() }
            );
        }

        // Idempotency at the batch level.
        const existingLogs = await base44.asServiceRole.entities.SyncEventLog.filter({
            event_id: eventId
        });
        if (existingLogs && existingLogs.length > 0) {
            return Response.json(
                {
                    ok: true,
                    status: 'DUPLICATE',
                    eventId,
                    note: 'Batch already processed'
                },
                { headers: corsHeaders() }
            );
        }

        const userEmail = connectedApp.user_email;
        const effectiveConnectionId = connection_id || connectedApp.id;
        const symbolClassDefault = PROVIDER_DEFAULT_CLASS[providerKey] || 'futures';
        const platformLabel = PROVIDER_PLATFORM_LABEL[providerKey] || providerKey;

        const syncLog = await base44.asServiceRole.entities.SyncEventLog.create({
            event_id: eventId,
            user_email: userEmail,
            event_type: 'HYBRIDCOPY_BATCH',
            source: 'HybridCopy',
            connection_id: effectiveConnectionId,
            payload: { provider: providerKey, account_external_id, trade_count: trades.length, snapshot_count: snapshots.length },
            status: 'pending'
        });

        let tradesCreated = 0;
        let tradesUpdated = 0;
        let snapshotsCreated = 0;
        let snapshotsUpdated = 0;
        const errors: { kind: string; id?: string; error: string }[] = [];

        // ---- Upsert trades by (provider, source_trade_id) -----------------
        for (const t of trades) {
            try {
                if (!t.source_trade_id) {
                    errors.push({ kind: 'trade', error: 'missing source_trade_id' });
                    continue;
                }

                const tradeData = {
                    user_email: userEmail,
                    provider: providerKey,
                    source: providerKey,
                    source_type: t.source_type || 'synced',
                    source_trade_id: t.source_trade_id,
                    connection_id: effectiveConnectionId,
                    external_account_id: account_external_id,
                    account_external_id: account_external_id,
                    platform: platformLabel,
                    symbol: t.symbol,
                    symbol_class: t.symbol_class || symbolClassDefault,
                    instrument_type:
                        t.instrument_type ||
                        (symbolClassDefault === 'futures'
                            ? 'Futures'
                            : symbolClassDefault === 'equities'
                            ? 'Stocks'
                            : 'Forex'),
                    side: normalizeSide(t.side),
                    quantity: t.qty ?? t.quantity ?? 0,
                    entry_date: t.entry_time || t.entry_date,
                    entry_price: t.entry_price,
                    exit_date: t.exit_time || t.exit_date || null,
                    exit_price: t.exit_price ?? null,
                    pnl: t.pnl_net ?? t.pnl ?? 0,
                    pnl_gross: t.pnl_gross ?? null,
                    fees_json: t.fees_json || null,
                    commission: t.fees_json?.commission || t.commission || 0,
                    swap: t.fees_json?.swap || t.swap || 0,
                    trade_status: (t.status || 'closed').toString().toLowerCase(),
                    session_type: t.session_type || null,
                    synced_from_hybridcopy: true,
                    hybridcopy_link: t.hybridcopy_link || null,
                    raw_payload: t.raw_payload || t
                };

                const existing = await base44.asServiceRole.entities.Trade.filter({
                    user_email: userEmail,
                    provider: providerKey,
                    source_trade_id: t.source_trade_id
                });

                if (existing && existing.length > 0) {
                    await base44.asServiceRole.entities.Trade.update(existing[0].id, tradeData);
                    tradesUpdated++;
                } else {
                    await base44.asServiceRole.entities.Trade.create(tradeData);
                    tradesCreated++;
                }
            } catch (err) {
                errors.push({ kind: 'trade', id: t.source_trade_id, error: err.message });
            }
        }

        // ---- Upsert snapshots by (provider, connection_id, timestamp) -----
        for (const s of snapshots) {
            try {
                if (!s.timestamp) {
                    errors.push({ kind: 'snapshot', error: 'missing timestamp' });
                    continue;
                }

                const snapshotData = {
                    user_email: userEmail,
                    provider: providerKey,
                    source: providerKey,
                    connection_id: effectiveConnectionId,
                    external_account_id: account_external_id,
                    account_external_id: account_external_id,
                    timestamp: s.timestamp,
                    balance: s.balance ?? 0,
                    equity: s.equity ?? 0,
                    margin_used: s.margin_used ?? 0,
                    margin_available: s.free_margin ?? s.margin_available ?? 0,
                    free_margin: s.free_margin ?? s.margin_available ?? 0,
                    unrealized_pnl: s.unrealized_pnl ?? 0,
                    buying_power: s.buying_power ?? null,
                    session_type:
                        s.session_type ||
                        (providerKey === 'GOOEYPRO' ? 'SINGLE_SESSION_EQUITIES' : null),
                    raw_masked_json: s.raw_masked_json || s
                };

                const existing = await base44.asServiceRole.entities.AccountSnapshot.filter({
                    provider: providerKey,
                    connection_id: effectiveConnectionId,
                    timestamp: s.timestamp
                });

                if (existing && existing.length > 0) {
                    await base44.asServiceRole.entities.AccountSnapshot.update(
                        existing[0].id,
                        snapshotData
                    );
                    snapshotsUpdated++;
                } else {
                    await base44.asServiceRole.entities.AccountSnapshot.create(snapshotData);
                    snapshotsCreated++;
                }
            } catch (err) {
                errors.push({ kind: 'snapshot', error: err.message });
            }
        }

        await base44.asServiceRole.entities.SyncEventLog.update(syncLog.id, {
            status: errors.length === 0 ? 'processed' : 'partial',
            processed_at: new Date().toISOString(),
            trades_created: tradesCreated,
            trades_updated: tradesUpdated,
            error_message: errors.length > 0 ? JSON.stringify(errors).slice(0, 2000) : null
        });

        await base44.asServiceRole.entities.ConnectedApp.update(connectedApp.id, {
            last_event_at: new Date().toISOString(),
            total_events_received: (connectedApp.total_events_received || 0) + 1
        });

        return Response.json(
            {
                ok: true,
                eventId,
                provider: providerKey,
                account_external_id,
                trades_created: tradesCreated,
                trades_updated: tradesUpdated,
                snapshots_created: snapshotsCreated,
                snapshots_updated: snapshotsUpdated,
                errors
            },
            { headers: corsHeaders() }
        );
    } catch (error) {
        console.error('[receiveFromHybridCopy] error', error);
        return Response.json(
            { error: error.message },
            { status: 500, headers: corsHeaders() }
        );
    }
});
