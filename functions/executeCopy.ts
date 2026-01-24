import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sourceTradeId, copyParamsId } = await req.json();

        if (!sourceTradeId || !copyParamsId) {
            return Response.json({ 
                error: 'Missing sourceTradeId or copyParamsId' 
            }, { status: 400 });
        }

        const startTime = Date.now();

        // Get copy parameters
        const copyParams = await base44.entities.CopyParameters.filter({
            id: copyParamsId,
            created_by: user.email
        });

        if (copyParams.length === 0 || !copyParams[0].enabled) {
            return Response.json({ 
                error: 'Copy parameters not found or disabled' 
            }, { status: 404 });
        }

        const params = copyParams[0];

        // Check daily limit
        const today = new Date().toISOString().split('T')[0];
        const todaysCopies = await base44.entities.CopiedTrade.filter({
            copy_params_id: copyParamsId,
            created_by: user.email
        });
        
        const copiesToday = todaysCopies.filter(c => 
            c.created_date && c.created_date.startsWith(today)
        ).length;

        if (params.max_daily_trades && copiesToday >= params.max_daily_trades) {
            return Response.json({ 
                error: 'Daily trade limit reached',
                limit: params.max_daily_trades,
                copied: copiesToday
            }, { status: 429 });
        }

        // Get source trade
        const sourceTrades = await base44.entities.Trade.filter({
            source_trade_id: sourceTradeId,
            created_by: user.email
        });

        if (sourceTrades.length === 0) {
            return Response.json({ error: 'Source trade not found' }, { status: 404 });
        }

        const sourceTrade = sourceTrades[0];

        // Check symbol filters
        if (params.allowed_symbols && params.allowed_symbols.length > 0) {
            if (!params.allowed_symbols.includes(sourceTrade.symbol)) {
                return Response.json({ 
                    error: 'Symbol not in allowed list',
                    symbol: sourceTrade.symbol 
                }, { status: 403 });
            }
        }

        if (params.blocked_symbols && params.blocked_symbols.includes(sourceTrade.symbol)) {
            return Response.json({ 
                error: 'Symbol is blocked',
                symbol: sourceTrade.symbol 
            }, { status: 403 });
        }

        // Apply symbol mapping
        const targetSymbol = params.symbol_mapping && params.symbol_mapping[sourceTrade.symbol]
            ? params.symbol_mapping[sourceTrade.symbol]
            : sourceTrade.symbol;

        // Calculate adjusted quantity
        let targetQuantity = (sourceTrade.quantity || 1) * (params.risk_multiplier || 1.0);
        
        if (params.max_position_size && targetQuantity > params.max_position_size) {
            targetQuantity = params.max_position_size;
        }

        // Prepare order payload
        const orderPayload = {
            symbol: targetSymbol,
            side: sourceTrade.side,
            quantity: targetQuantity,
            entry_price: sourceTrade.entry_price,
            stop_loss: params.copy_stop_loss ? sourceTrade.stop_loss : null,
            take_profit: params.copy_take_profit ? sourceTrade.take_profit : null,
            max_slippage_pips: params.max_slippage_pips || 5,
            source_trade_id: sourceTradeId
        };

        // Adjust SL/TP if offsets specified
        if (params.adjust_sl_offset_pips && orderPayload.stop_loss) {
            const pipValue = 0.0001; // Adjust based on symbol type
            orderPayload.stop_loss += params.adjust_sl_offset_pips * pipValue;
        }

        if (params.adjust_tp_offset_pips && orderPayload.take_profit) {
            const pipValue = 0.0001;
            orderPayload.take_profit += params.adjust_tp_offset_pips * pipValue;
        }

        // Create copied trade record
        const copiedTrade = await base44.entities.CopiedTrade.create({
            copy_params_id: copyParamsId,
            source_trade_id: sourceTradeId,
            source_connection_id: params.source_connection_id,
            target_connection_id: params.target_connection_id,
            symbol: targetSymbol,
            side: sourceTrade.side,
            source_quantity: sourceTrade.quantity,
            copied_quantity: targetQuantity,
            source_entry_price: sourceTrade.entry_price,
            copy_status: 'pending'
        });

        // Execute the trade (placeholder - would call actual broker API)
        // In production, this would route to the appropriate broker adapter
        const executionResult = {
            success: true,
            trade_id: `COPY_${Date.now()}`,
            executed_price: sourceTrade.entry_price,
            executed_quantity: targetQuantity,
            slippage_pips: 0.5
        };

        const executionTime = Date.now() - startTime;

        // Update copied trade with execution results
        await base44.entities.CopiedTrade.update(copiedTrade.id, {
            target_trade_id: executionResult.trade_id,
            copied_entry_price: executionResult.executed_price,
            slippage_pips: executionResult.slippage_pips,
            copy_status: executionResult.success ? 'executed' : 'failed',
            execution_time_ms: executionTime,
            error_message: executionResult.success ? null : executionResult.error,
            raw_execution_response: executionResult
        });

        // Update copy parameters stats
        await base44.entities.CopyParameters.update(copyParamsId, {
            last_copy_at: new Date().toISOString(),
            trades_copied_today: copiesToday + 1
        });

        // Emit event to Hybrid Journal for automatic journaling
        const journalEventId = `copy_${copiedTrade.id}_${Date.now()}`;
        
        await base44.functions.invoke('syncEvents', {
            eventId: journalEventId,
            eventType: 'trade.opened',
            source: 'iCopyTrade',
            connectionId: params.target_connection_id,
            trades: [{
                sourceTradeId: executionResult.trade_id,
                symbol: targetSymbol,
                side: sourceTrade.side,
                entryTime: new Date().toISOString(),
                entryPrice: executionResult.executed_price,
                quantity: targetQuantity,
                stopLoss: orderPayload.stop_loss,
                takeProfit: orderPayload.take_profit,
                status: 'open',
                pnl: 0,
                pnlNet: 0,
                accountId: params.target_connection_id,
                tags: ['auto-copied', `source:${sourceTrade.symbol}`]
            }]
        });

        return Response.json({
            status: 'success',
            copiedTradeId: copiedTrade.id,
            targetTradeId: executionResult.trade_id,
            executionTimeMs: executionTime,
            slippagePips: executionResult.slippage_pips,
            orderPayload
        });

    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});