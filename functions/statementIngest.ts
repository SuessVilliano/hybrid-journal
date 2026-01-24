import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fileUrl, connectionId, provider } = await req.json();

        if (!fileUrl || !connectionId || !provider) {
            return Response.json({ 
                error: 'Missing required fields: fileUrl, connectionId, provider' 
            }, { status: 400 });
        }

        // Define the expected trade schema for extraction
        const tradeSchema = {
            type: "array",
            items: {
                type: "object",
                properties: {
                    sourceTradeId: { type: "string" },
                    symbol: { type: "string" },
                    side: { type: "string" },
                    entryTime: { type: "string" },
                    exitTime: { type: "string" },
                    entryPrice: { type: "number" },
                    exitPrice: { type: "number" },
                    quantity: { type: "number" },
                    commission: { type: "number" },
                    swap: { type: "number" },
                    pnl: { type: "number" }
                },
                required: ["symbol", "side", "entryTime", "pnl"]
            }
        };

        // Extract data from uploaded file using Core integration
        const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: fileUrl,
            json_schema: tradeSchema
        });

        if (extractResult.status === 'error') {
            return Response.json({ 
                error: 'Failed to extract data from file',
                details: extractResult.details 
            }, { status: 400 });
        }

        const extractedTrades = extractResult.output || [];
        
        let tradesCreated = 0;
        let tradesUpdated = 0;
        let tradesSkipped = 0;

        // Create event ID for this import
        const eventId = `statement_${connectionId}_${Date.now()}`;

        // Create event log
        const eventLog = await base44.entities.SyncEventLog.create({
            event_id: eventId,
            connection_id: connectionId,
            user_email: user.email,
            event_type: 'manual.import',
            source: provider,
            payload: { fileUrl, tradesCount: extractedTrades.length },
            status: 'pending'
        });

        // Process each extracted trade
        for (const trade of extractedTrades) {
            const sourceTradeId = trade.sourceTradeId || `${trade.symbol}_${trade.entryTime}_${trade.pnl}`;

            // Check for existing trade
            const existingTrades = await base44.entities.Trade.filter({
                source: provider,
                source_trade_id: sourceTradeId,
                created_by: user.email
            });

            const normalizedTrade = {
                source: provider,
                source_trade_id: sourceTradeId,
                connection_id: connectionId,
                symbol: trade.symbol,
                platform: provider,
                side: trade.side,
                entry_date: trade.entryTime,
                exit_date: trade.exitTime,
                entry_price: trade.entryPrice,
                exit_price: trade.exitPrice,
                quantity: trade.quantity,
                commission: trade.commission || 0,
                swap: trade.swap || 0,
                pnl: trade.pnl,
                pnl_net: trade.pnl - (trade.commission || 0) - (trade.swap || 0),
                import_source: 'Statement Import',
                broker_connection_id: connectionId,
                broker_trade_id: sourceTradeId,
                trade_status: 'closed',
                raw_payload: trade
            };

            if (existingTrades.length > 0) {
                await base44.entities.Trade.update(existingTrades[0].id, normalizedTrade);
                tradesUpdated++;
            } else {
                await base44.entities.Trade.create(normalizedTrade);
                tradesCreated++;
            }
        }

        // Update event log
        await base44.entities.SyncEventLog.update(eventLog.id, {
            status: 'processed',
            processed_at: new Date().toISOString(),
            trades_created: tradesCreated,
            trades_updated: tradesUpdated,
            trades_skipped: tradesSkipped
        });

        // Update connection status
        await base44.entities.BrokerConnection.update(connectionId, {
            last_sync_at: new Date().toISOString(),
            status: 'connected'
        });

        return Response.json({
            status: 'success',
            tradesCreated,
            tradesUpdated,
            tradesSkipped,
            totalProcessed: extractedTrades.length
        });

    } catch (error) {
        return Response.json({ 
            error: error.message,
            status: 'failed'
        }, { status: 500 });
    }
});