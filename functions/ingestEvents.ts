import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Extract headers
        const timestamp = req.headers.get('X-Timestamp');
        const signature = req.headers.get('X-Signature');
        const eventId = req.headers.get('X-Event-Id');

        if (!timestamp || !signature) {
            return Response.json({ 
                error: 'Missing required headers: X-Timestamp, X-Signature' 
            }, { status: 400 });
        }

        // Parse body
        const body = await req.json();
        const { sourceApp, journalUserId, events } = body;

        if (!sourceApp || !journalUserId || !events) {
            return Response.json({ 
                error: 'Missing required fields: sourceApp, journalUserId, events' 
            }, { status: 400 });
        }

        // Verify timestamp (reject if older than 5 minutes to prevent replay attacks)
        const requestTime = new Date(timestamp);
        const now = new Date();
        const timeDiff = Math.abs(now - requestTime) / 1000; // seconds

        if (timeDiff > 300) {
            return Response.json({ 
                error: 'Request timestamp too old (>5 minutes)' 
            }, { status: 400 });
        }

        // Get connected app for this user
        const connectedApps = await base44.asServiceRole.entities.ConnectedApp.filter({
            user_id: journalUserId,
            app_name: sourceApp,
            status: 'active'
        });

        if (connectedApps.length === 0) {
            return Response.json({ 
                error: 'No active connection found for this user and app' 
            }, { status: 403 });
        }

        const connectedApp = connectedApps[0];

        // Verify HMAC signature
        // Expected format: HMAC-SHA256(timestamp + JSON.stringify(body), secret)
        const bodyString = JSON.stringify(body);
        const message = timestamp + bodyString;

        // In production, retrieve actual secret from vault using signing_secret_ref
        // For now, we'll use the hash for validation (simplified)
        const encoder = new TextEncoder();
        const keyData = encoder.encode(connectedApp.signing_secret_hash);
        const messageData = encoder.encode(message);

        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
        const signatureArray = Array.from(new Uint8Array(signatureBuffer));
        const expectedSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (signature !== expectedSignature) {
            return Response.json({ 
                error: 'Invalid signature' 
            }, { status: 403 });
        }

        // Process events
        const results = {
            processed: 0,
            duplicates: 0,
            failed: 0,
            errors: []
        };

        for (const event of events) {
            const evtId = event.eventId || `${journalUserId}_${Date.now()}_${Math.random()}`;

            // Check for duplicate
            const existingLogs = await base44.asServiceRole.entities.SyncEventLog.filter({
                event_id: evtId
            });

            if (existingLogs.length > 0) {
                results.duplicates++;
                continue;
            }

            try {
                // Create sync event log
                await base44.asServiceRole.entities.SyncEventLog.create({
                    event_id: evtId,
                    connection_id: null,
                    user_email: connectedApp.user_email,
                    event_type: event.eventType,
                    source: sourceApp,
                    payload: event.payload,
                    status: 'pending'
                });

                // Process based on event type
                if (event.eventType === 'TRADE_UPSERT') {
                    const payload = event.payload;

                    // Check if trade exists (by source + source_trade_id)
                    const existingTrades = await base44.asServiceRole.entities.Trade.filter({
                        source: payload.source,
                        source_trade_id: payload.sourceTradeId,
                        created_by: connectedApp.user_email
                    });

                    if (existingTrades.length > 0) {
                        // Update existing trade
                        await base44.asServiceRole.entities.Trade.update(existingTrades[0].id, {
                            exit_date: payload.exitTime,
                            exit_price: payload.exitPrice,
                            pnl: payload.pnl,
                            pnl_net: payload.pnlNet,
                            trade_status: payload.status,
                            raw_payload: payload
                        });
                    } else {
                        // Create new trade
                        await base44.asServiceRole.entities.Trade.create({
                            source: payload.source,
                            source_trade_id: payload.sourceTradeId,
                            connection_id: payload.connectionId,
                            external_account_id: payload.accountId,
                            symbol: payload.symbol,
                            side: payload.side,
                            entry_date: payload.entryTime,
                            exit_date: payload.exitTime,
                            entry_price: payload.entryPrice,
                            exit_price: payload.exitPrice,
                            quantity: payload.quantity,
                            stop_loss: payload.stopLoss,
                            take_profit: payload.takeProfit,
                            pnl: payload.pnl,
                            pnl_net: payload.pnlNet,
                            trade_status: payload.status,
                            tags: payload.tags || [],
                            raw_payload: payload,
                            created_by: connectedApp.user_email
                        });
                    }
                } else if (event.eventType === 'ACCOUNT_SNAPSHOT') {
                    const payload = event.payload;

                    await base44.asServiceRole.entities.AccountSnapshot.create({
                        user_email: connectedApp.user_email,
                        connection_id: payload.connectionId,
                        external_account_id: payload.accountId,
                        source: payload.source,
                        timestamp: payload.timestamp || new Date().toISOString(),
                        balance: payload.balance,
                        equity: payload.equity,
                        margin_used: payload.marginUsed,
                        margin_available: payload.marginAvailable,
                        drawdown_daily: payload.drawdownDaily,
                        drawdown_daily_percent: payload.drawdownDailyPercent,
                        drawdown_trailing: payload.drawdownTrailing,
                        drawdown_trailing_percent: payload.drawdownTrailingPercent,
                        open_positions: payload.openPositions,
                        raw_masked_json: payload
                    });
                }

                // Mark event as processed
                await base44.asServiceRole.entities.SyncEventLog.update(existingLogs.length > 0 ? existingLogs[0].id : evtId, {
                    status: 'processed',
                    processed_at: new Date().toISOString()
                });

                results.processed++;

            } catch (error) {
                results.failed++;
                results.errors.push({
                    eventId: evtId,
                    error: error.message
                });

                // Mark as failed
                const failedLogs = await base44.asServiceRole.entities.SyncEventLog.filter({
                    event_id: evtId
                });
                if (failedLogs.length > 0) {
                    await base44.asServiceRole.entities.SyncEventLog.update(failedLogs[0].id, {
                        status: 'failed',
                        error_message: error.message
                    });
                }
            }
        }

        // Update ConnectedApp stats
        await base44.asServiceRole.entities.ConnectedApp.update(connectedApp.id, {
            last_event_at: new Date().toISOString(),
            total_events_received: connectedApp.total_events_received + events.length
        });

        return Response.json({
            status: 'success',
            processed: results.processed,
            duplicates: results.duplicates,
            failed: results.failed,
            errors: results.errors
        });

    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});