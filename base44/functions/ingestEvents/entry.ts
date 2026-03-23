import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function verifyHMAC(secret, timestamp, rawBody) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(`${timestamp}.${rawBody}`);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hexSignature = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return hexSignature;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Get raw body string BEFORE parsing (needed for signature verification)
        const rawBody = await req.text();
        const body = JSON.parse(rawBody);

        // Extract headers
        const timestamp = req.headers.get('X-Timestamp');
        const signature = req.headers.get('X-Signature');
        const eventId = req.headers.get('X-Event-Id');

        if (!timestamp || !signature || !eventId) {
            return Response.json({ 
                error: 'Missing required headers (X-Timestamp, X-Signature, X-Event-Id)' 
            }, { status: 400 });
        }

        // Verify timestamp within replay window (300 seconds)
        const now = Math.floor(Date.now() / 1000);
        const requestTime = parseInt(timestamp);

        if (Math.abs(now - requestTime) > 300) {
            return Response.json({ 
                error: 'Request timestamp outside replay window' 
            }, { status: 401 });
        }

        // Look up the shared secret (use asServiceRole for system-level operation)
        // Try the exact source name first
        let connectedApps = await base44.asServiceRole.entities.ConnectedApp.filter({
            user_id: body.userId,
            app_name: body.source || 'HybridCopy',
            status: 'active'
        });

        if (connectedApps.length === 0) {
            return Response.json({
                error: 'No active connection found for this user and source'
            }, { status: 404 });
        }

        const connectedApp = connectedApps[0];
        const sharedSigningSecret = connectedApp.signing_secret_ref;

        // Verify HMAC signature
        const expectedSignature = await verifyHMAC(sharedSigningSecret, timestamp, rawBody);

        if (signature.toLowerCase() !== expectedSignature.toLowerCase()) {
            return Response.json({ 
                error: 'Invalid signature' 
            }, { status: 401 });
        }

        // Check idempotency using X-Event-Id
        const existingLogs = await base44.asServiceRole.entities.SyncEventLog.filter({
            event_id: eventId
        });

        if (existingLogs.length > 0) {
            return Response.json({ 
                ok: true, 
                status: 'DUPLICATE', 
                eventId: eventId 
            });
        }

        // Create sync log entry
        const syncLog = await base44.asServiceRole.entities.SyncEventLog.create({
            event_id: eventId,
            user_email: connectedApp.user_email,
            event_type: body.eventType || 'unknown',
            source: body.source || 'HybridCopy',
            connection_id: body.connectionId || null,
            payload: body,
            status: 'pending'
        });

        // Process event based on eventType
        let tradesCreated = 0;
        let tradesUpdated = 0;
        let tradesSkipped = 0;

        try {
            if (body.eventType === 'TRADE_UPSERT' && body.trade) {
                const trade = body.trade;

                // Check if trade already exists
                const existingTrades = await base44.asServiceRole.entities.Trade.filter({
                    created_by: connectedApp.user_email,
                    source: body.provider || body.source,
                    source_trade_id: trade.sourceTradeId
                });

                const tradeData = {
                    source: body.provider || body.source,
                    source_trade_id: trade.sourceTradeId,
                    connection_id: body.connectionId || null,
                    external_account_id: trade.accountExternalId,
                    symbol: trade.symbol,
                    side: trade.side,
                    entry_date: trade.entryTime,
                    entry_price: trade.entryPrice,
                    exit_date: trade.exitTime || null,
                    exit_price: trade.exitPrice || null,
                    quantity: trade.qty,
                    stop_loss: trade.stopLoss || null,
                    take_profit: trade.takeProfit || null,
                    commission: trade.fees?.commission || 0,
                    swap: trade.fees?.swap || 0,
                    pnl: trade.pnlNet || 0,
                    trade_status: trade.status?.toLowerCase() || 'closed',
                    raw_payload: trade.rawMaskedJson || {}
                };

                if (existingTrades.length > 0) {
                    await base44.asServiceRole.entities.Trade.update(existingTrades[0].id, tradeData);
                    tradesUpdated = 1;
                } else {
                    await base44.asServiceRole.entities.Trade.create(tradeData);
                    tradesCreated = 1;
                }

            } else if (body.eventType === 'SNAPSHOT_UPSERT' && body.snapshot) {
                const snapshot = body.snapshot;

                await base44.asServiceRole.entities.AccountSnapshot.create({
                    user_email: connectedApp.user_email,
                    connection_id: body.connectionId || null,
                    external_account_id: snapshot.accountExternalId,
                    source: body.provider || body.source,
                    timestamp: snapshot.timestamp,
                    balance: snapshot.balance || 0,
                    equity: snapshot.equity || 0,
                    margin_used: snapshot.marginUsed || 0,
                    margin_available: snapshot.freeMargin || 0,
                    drawdown_daily: snapshot.drawdownDaily || 0,
                    drawdown_daily_percent: snapshot.drawdownDailyPercent || 0,
                    drawdown_trailing: snapshot.drawdownTrailing || 0,
                    drawdown_trailing_percent: snapshot.drawdownTrailingPercent || 0,
                    raw_masked_json: snapshot.rawMaskedJson || {}
                });

            } else if (body.eventType === 'SIGNAL' && body.signal) {
                const signal = body.signal;

                await base44.asServiceRole.entities.Signal.create({
                    user_email: connectedApp.user_email,
                    provider: body.provider || 'HybridCopy',
                    symbol: signal.symbol,
                    action: signal.side,
                    price: signal.entryPrice || null,
                    stop_loss: signal.stopLoss || null,
                    take_profit: signal.takeProfit || null,
                    timeframe: signal.timeframe || null,
                    strategy: signal.strategy || null,
                    notes: signal.message || null,
                    status: 'new',
                    raw_data: signal
                });
            }

            // Update sync log with success
            await base44.asServiceRole.entities.SyncEventLog.update(syncLog.id, {
                status: 'processed',
                processed_at: new Date().toISOString(),
                trades_created: tradesCreated,
                trades_updated: tradesUpdated,
                trades_skipped: tradesSkipped
            });

            // Update ConnectedApp last event time and counter
            await base44.asServiceRole.entities.ConnectedApp.update(connectedApp.id, {
                last_event_at: new Date().toISOString(),
                total_events_received: (connectedApp.total_events_received || 0) + 1
            });

            return Response.json({ 
                ok: true, 
                status: 'OK', 
                eventId: eventId 
            });

        } catch (processingError) {
            // Update sync log with failure
            await base44.asServiceRole.entities.SyncEventLog.update(syncLog.id, {
                status: 'failed',
                error_message: processingError.message
            });

            throw processingError;
        }

    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});