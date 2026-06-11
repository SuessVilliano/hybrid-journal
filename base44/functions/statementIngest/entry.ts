import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Normalize a broker-reported side to the Trade schema's Long|Short enum.
// Buy/BuyToCover/Long -> Long; Sell/SellShort/Short -> Short.
function normalizeSide(raw: unknown): 'Long' | 'Short' {
    const s = String(raw ?? '').trim().toLowerCase();
    if (s.startsWith('sell') || s.startsWith('short') || s === 's') return 'Short';
    return 'Long';
}

// Normalize a statement timestamp to an ISO 8601 string (pass through values
// that can't be parsed rather than fabricating a date).
function toIso(value: unknown): string | null {
    if (value == null || value === '') return null;
    const parsed = Date.parse(String(value));
    return isNaN(parsed) ? String(value) : new Date(parsed).toISOString();
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fileUrl, connectionId, provider, accountId } = await req.json();

        if (!fileUrl || !connectionId || !provider) {
            return Response.json({
                error: 'Missing required fields: fileUrl, connectionId, provider'
            }, { status: 400 });
        }

        // Resolve the internal Account id so created trades show up in the
        // Accounts page stats: prefer the caller-selected account, fall back
        // to the account linked on the broker connection.
        let resolvedAccountId: string | null = accountId || null;
        if (!resolvedAccountId) {
            try {
                const conns = await base44.entities.BrokerConnection.filter({ id: connectionId });
                resolvedAccountId = conns?.[0]?.account_id || null;
            } catch (_e) {
                resolvedAccountId = null;
            }
        }

        // Define the expected trade schema for extraction.
        // Conventions (the descriptions instruct the extractor; the code below
        // still normalizes defensively):
        //   - side: Buy/Long or Sell/Short — normalized to Long|Short.
        //   - times: ISO 8601 — normalized via toIso().
        //   - commission/swap: COSTS as POSITIVE numbers — normalized with
        //     Math.abs(commission); swap keeps its sign because a negative
        //     value documents a credit (swap earned, not paid).
        //   - pnl: gross P&L excluding commission and swap.
        const tradeSchema = {
            type: "array",
            items: {
                type: "object",
                properties: {
                    sourceTradeId: { type: "string", description: "Broker's unique trade/ticket/deal id, if present" },
                    symbol: { type: "string" },
                    side: { type: "string", description: "Trade direction: 'Long' (buy) or 'Short' (sell)" },
                    entryTime: { type: "string", description: "Entry timestamp in ISO 8601 format" },
                    exitTime: { type: "string", description: "Exit timestamp in ISO 8601 format" },
                    entryPrice: { type: "number" },
                    exitPrice: { type: "number" },
                    quantity: { type: "number" },
                    commission: { type: "number", description: "Commission cost as a POSITIVE number (e.g. a $7 fee is 7, not -7)" },
                    swap: { type: "number", description: "Swap/rollover cost as a POSITIVE number; use a negative number only if the swap was a credit to the account" },
                    pnl: { type: "number", description: "Gross profit/loss of the trade, EXCLUDING commission and swap (negative for losses)" }
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
        for (let fillIndex = 0; fillIndex < extractedTrades.length; fillIndex++) {
            const trade = extractedTrades[fillIndex];

            // Fallback dedupe key includes quantity and the fill's sequence in
            // the statement so split/partial fills with identical
            // symbol/time/pnl don't collide (and silently drop fills).
            const sourceTradeId = trade.sourceTradeId ||
                `${trade.symbol}_${trade.entryTime}_${trade.pnl}_${trade.quantity ?? 'na'}_${fillIndex}`;

            // Check for existing trade
            const existingTrades = await base44.entities.Trade.filter({
                source: provider,
                source_trade_id: sourceTradeId,
                created_by: user.email
            });

            // Normalize costs to the documented extraction convention:
            // commission is always a cost — Math.abs prevents double-counting
            // when a broker reports it as a negative number. Swap keeps its
            // sign (positive = cost, negative = credit).
            const pnl = Number(trade.pnl) || 0;
            const commission = Math.abs(Number(trade.commission) || 0);
            const swap = Number(trade.swap) || 0;

            const normalizedTrade = {
                source: provider,
                source_trade_id: sourceTradeId,
                connection_id: connectionId,
                account_id: resolvedAccountId || undefined,
                symbol: trade.symbol,
                platform: provider,
                side: normalizeSide(trade.side),
                entry_date: toIso(trade.entryTime),
                exit_date: toIso(trade.exitTime),
                entry_price: trade.entryPrice,
                exit_price: trade.exitPrice,
                quantity: trade.quantity,
                commission,
                swap,
                pnl,
                pnl_net: pnl - commission - swap,
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

        // Update connection status. `last_sync_at` is canonical; `last_sync`
        // is written too during the transition for older readers.
        const syncedAt = new Date().toISOString();
        await base44.entities.BrokerConnection.update(connectionId, {
            last_sync_at: syncedAt,
            last_sync: syncedAt,
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