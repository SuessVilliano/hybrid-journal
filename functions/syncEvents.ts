import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHmac, timingSafeEqual } from 'node:crypto';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.text();
        const data = JSON.parse(body);

        // Extract signature and timestamp from headers
        const signature = req.headers.get('X-Signature');
        const timestamp = req.headers.get('X-Timestamp');

        // Verify signature if provided (for iCopyTrade or webhook sources)
        if (signature && data.connectionId) {
            const connection = await base44.entities.BrokerConnection.filter({ 
                id: data.connectionId,
                created_by: user.email 
            });

            if (connection.length === 0) {
                return Response.json({ error: 'Connection not found' }, { status: 404 });
            }

            const webhookSecret = connection[0].webhook_secret;
            if (webhookSecret) {
                // Verify timestamp to prevent replay attacks (5 min window)
                const requestTime = parseInt(timestamp);
                const currentTime = Date.now();
                if (Math.abs(currentTime - requestTime) > 300000) {
                    return Response.json({ error: 'Request expired' }, { status: 401 });
                }

                // Verify HMAC signature
                const expectedSignature = createHmac('sha256', webhookSecret)
                    .update(timestamp + '.' + body)
                    .digest('hex');

                const signatureBuffer = Buffer.from(signature);
                const expectedBuffer = Buffer.from(expectedSignature);

                if (signatureBuffer.length !== expectedBuffer.length || 
                    !timingSafeEqual(signatureBuffer, expectedBuffer)) {
                    return Response.json({ error: 'Invalid signature' }, { status: 401 });
                }
            }
        }

        const { eventId, eventType, source, connectionId, trades, snapshot } = data;

        // Check for duplicate event (idempotency)
        const existingEvent = await base44.entities.SyncEventLog.filter({
            event_id: eventId,
            user_email: user.email
        });

        if (existingEvent.length > 0) {
            return Response.json({ 
                status: 'duplicate', 
                message: 'Event already processed',
                eventId 
            }, { status: 200 });
        }

        // Create event log
        const eventLog = await base44.entities.SyncEventLog.create({
            event_id: eventId,
            connection_id: connectionId,
            user_email: user.email,
            event_type: eventType,
            source: source,
            payload: data,
            status: 'pending'
        });

        let tradesCreated = 0;
        let tradesUpdated = 0;
        let tradesSkipped = 0;

        // Process trades
        if (trades && Array.isArray(trades)) {
            for (const trade of trades) {
                const sourceTradeId = trade.sourceTradeId || trade.id || trade.tradeId;
                
                if (!sourceTradeId) {
                    tradesSkipped++;
                    continue;
                }

                // Check if trade exists using source + sourceTradeId
                const existingTrades = await base44.entities.Trade.filter({
                    source: source,
                    source_trade_id: sourceTradeId,
                    created_by: user.email
                });

                const normalizedTrade = {
                    source: source,
                    source_trade_id: sourceTradeId,
                    connection_id: connectionId,
                    external_account_id: trade.accountId || trade.externalAccountId,
                    symbol: trade.symbol,
                    platform: source,
                    side: trade.side,
                    entry_date: trade.entryTime || trade.openTime,
                    exit_date: trade.exitTime || trade.closeTime,
                    entry_price: trade.entryPrice || trade.openPrice,
                    exit_price: trade.exitPrice || trade.closePrice,
                    quantity: trade.qty || trade.quantity || trade.volume,
                    stop_loss: trade.stopLoss || trade.sl,
                    take_profit: trade.takeProfit || trade.tp,
                    commission: trade.commission || 0,
                    swap: trade.swap || 0,
                    pnl: trade.pnl,
                    pnl_net: trade.pnlNet || trade.pnl,
                    trade_status: trade.status || 'closed',
                    import_source: 'Auto-Sync',
                    broker_connection_id: connectionId,
                    broker_trade_id: sourceTradeId,
                    raw_payload: trade
                };

                if (existingTrades.length > 0) {
                    // Update existing trade
                    await base44.entities.Trade.update(existingTrades[0].id, normalizedTrade);
                    tradesUpdated++;
                } else {
                    // Create new trade
                    await base44.entities.Trade.create(normalizedTrade);
                    tradesCreated++;
                }
            }
        }

        // Process account snapshot
        if (snapshot) {
            await base44.entities.AccountSnapshot.create({
                user_email: user.email,
                connection_id: connectionId,
                external_account_id: snapshot.accountId,
                source: source,
                timestamp: new Date().toISOString(),
                balance: snapshot.balance,
                equity: snapshot.equity,
                margin_used: snapshot.marginUsed,
                margin_available: snapshot.marginAvailable,
                drawdown_daily: snapshot.drawdownDaily,
                drawdown_daily_percent: snapshot.drawdownDailyPercent,
                drawdown_trailing: snapshot.drawdownTrailing,
                drawdown_trailing_percent: snapshot.drawdownTrailingPercent,
                open_positions: snapshot.openPositions,
                raw_masked_json: snapshot
            });
        }

        // Update event log
        await base44.entities.SyncEventLog.update(eventLog.id, {
            status: 'processed',
            processed_at: new Date().toISOString(),
            trades_created: tradesCreated,
            trades_updated: tradesUpdated,
            trades_skipped: tradesSkipped
        });

        // Update connection last_sync_at
        if (connectionId) {
            await base44.entities.BrokerConnection.update(connectionId, {
                last_sync_at: new Date().toISOString(),
                status: 'connected'
            });
        }

        return Response.json({
            status: 'success',
            eventId,
            tradesCreated,
            tradesUpdated,
            tradesSkipped,
            snapshotCreated: snapshot ? 1 : 0
        });

    } catch (error) {
        return Response.json({ 
            error: error.message,
            status: 'failed'
        }, { status: 500 });
    }
});